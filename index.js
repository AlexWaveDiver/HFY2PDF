// index.js
'use strict';

var snoowrap = require('snoowrap'),
    PDFDocument = require('pdfkit'),
    fs = require('fs'),
    ePub = require('epub-gen'),
    sqlite3 = require('sqlite3').verbose(),
    slug = require('speakingurl').createSlug({
        maintainCase: true,
        separator: '_'
    }),

    dir = "/home/humanityfuckyeah/public_html/oc/", // Output
    subreddit = "awdhfybottest", // Subreddit
    website = "https://www.humanityfuckyeah.space/oc/"; // Website

// Reddit credentials
const req = new snoowrap({
    userAgent: 'HFY2PDF v0.1 by Alex WaveDiver (/u/AlexVixgeck)',
    clientId: '',
    clientSecret: '',
    username: '',
    password: ''
});

// ---------------------------------------------

var db = new sqlite3.Database("data.sqlite3");
db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, idSubmission TEXT)");
db.run("CREATE TABLE IF NOT EXISTS whitelist (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT)");

// Subscribe/Unsubscribe messages
req.getUnreadMessages({
    filter: 'messages'
}).then(unreadMessages => {
    unreadMessages.forEach(function(message) {
        var author = message.author.name;
        var subject = message.subject;

        if (typeof author != "undefined" && typeof subject != "undefined") {
            if (subject.toLowerCase() == "subscribe") {
                db.get('SELECT COUNT(*) as count FROM whitelist WHERE user = ?', author, function(err, row) {
                    if (typeof row == "undefined" || row.count == 0) {
                        db.run("INSERT INTO whitelist(user) VALUES (?)", author);
                        message.reply("You've been subscribed.\n\n___\n\n*[Contact](/message/compose?to=AlexVixgeck)*");
                    }
                });
            } else if (subject.toLowerCase() == "unsubscribe") {
                db.get('DELETE FROM whitelist WHERE user = ?', author, function(err, row) {
                    message.reply("You've been unsuscribed.\n\n___\n\n*[Contact](/message/compose?to=AlexVixgeck)*");
                });
            }
        }
        req.markMessagesAsRead([message.id]);
    });

    // Let's roll:
    req.getSubreddit(subreddit).getNew().then(subredditInfo => {
        subredditInfo.forEach(function(submission) {
            db.get('SELECT COUNT(*) as count FROM whitelist WHERE user = ?', submission.author.name, function(err, row) {
                if (typeof row != "undefined" && row.count > 0) {
                    db.get('SELECT COUNT(*) as count FROM posts WHERE idSubmission = ?', submission.id, function(err, row) {
                        if (typeof row == "undefined" || row.count == 0) {
                            if (typeof submission.title != "undefined" && typeof submission.selftext != "undefined" && typeof submission.url != "undefined" && typeof submission.is_self != "undefined" && submission.is_self == true && typeof submission.link_flair_css_class != "undefined" && submission.link_flair_css_class == "OC") {
                                // PDF
                                // ---------------
                                var doc = new PDFDocument();
                                doc.pipe(fs.createWriteStream(dir + slug(submission.title) + '.pdf'));

                                // Cover
                                doc.font('fonts/Merriweather-Regular.ttf')
                                    .fontSize(30).moveDown(3)
                                    .text(submission.title, {
                                        align: 'center'
                                    })
                                    .fontSize(10).fillColor('gray')
                                    .text("______________________________________________________", {
                                        align: 'center'
                                    })
                                    .font('fonts/Merriweather-Italic.ttf').fillColor('black')
                                    .fontSize(15).moveDown(1)
                                    .text("u/" + submission.author.name, {
                                        align: 'center'
                                    })
                                    .fontSize(10).moveDown(5)
                                    .text(submission.url, {
                                        align: 'center'
                                    });

                                // Body
                                doc.addPage().font('fonts/Merriweather-Regular.ttf')
                                    .fontSize(10)
                                    .text(submission.selftext, 100, 100);
                                doc.save().end();


                                // ePub
                                // ---------------
                                var option = {
                                    title: submission.title,
                                    author: submission.author.name,
                                    cover: "./cover.jpg",
                                    content: [{
                                        title: "",
                                        data: "<h1 style='text-align: center'>" + submission.title + "</h1><hr><div style='text-align: center;'>u/" + submission.author.name + "<br><br><a href='" + submission.url + "' style='word-wrap: break-word;'>" + submission.url + "</a></div><hr>" + submission.selftext_html
                                    }]
                                };

                                new ePub(option, dir + slug(submission.title) + ".epub");

                                submission.reply("I'm a bot, *bleep*, *bloop*. I've converted this post in both PDF and ePub:\n\n- [PDF](" + website + slug(submission.title) + ".pdf)\n- [ePub](" + website + slug(submission.title) + ".epub)\n\n___\n\n^This ^is ^an ^opt-in ^bot: \n\n^- ^Do ^you ^want ^me ^to ^convert ^your ^stories? ^[Subscribe](/message/compose?to=hfy2pdf&subject=subscribe&body=subscribe)\n\n^- ^Tired? ^[Unsubscribe](/message/compose?to=hfy2pdf&subject=unsubscribe&body=unsubscribe)\n\n^- ^[Contact](/message/compose?to=AlexVixgeck&subject=HFY2PDF) ^- ^This ^bot ^is ^[Open-Source](https://github.com/AlexWaveDiver/HFY2PDF)");
                                db.run("INSERT INTO posts(idSubmission) VALUES (?)", submission.id);
                            }
                        }
                    });
                }
            });
        });
    });
});