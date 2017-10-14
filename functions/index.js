/**
 * 2 functions:
 *
 * 1. take all input in /raw emails, combine and filter into a single message (you have had x important, and y boring emails in the last n minutes) to /aggregated. Clear /raw
 * 2. take all input from /aggregated, trigger a zapier webhook. Clear /filtered
 */

'use strict';


const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request-promise');

admin.initializeApp(functions.config().firebase);


const UNFILTERED_ROOT = '/raw';
const RULES_ROOT = '/rules';
const AGGREGATE_ROOT = '/aggregated';
const OUTGOING_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/2292424/i950xr/';


/**
 * Called to trigger a database check.
 *
 */
exports.triggerCheckEmail = functions.https.onRequest((req, res) => {


  //read all the unfiltered emails.
  //format: fromAddress, fromName, messageBody
  return admin.database().ref('raw/').once('value', (snapshot) => {
    const allValues = snapshot.val();
    const keys = Object.keys(allValues);

    keys.forEach(key => {
      console.log(allValues[key]);
    });

    return admin.database().ref(AGGREGATE_ROOT).push().set("You've got mail");
  })
  .then(() => {
    return res.status(200).send(true);
  })
  .catch(err => {
    return res.status(500).send(err);
  });



  // //TODO: read filtered rules from /rules. This works for now:
  // const filterIn = ["lewisdaly@me.com", 'engagespark'];
  //
  // const important = [];
  // const boring = [];
  //
  // //build a summary string, and add to /aggregated
  // const summaryString = `You have ${important.length} important emails, and ${boring.length} emails.`;
  //Save

  //clear everything from UNFILTERED_ROOT
});

exports.sendMessage = functions.database.ref(`${AGGREGATE_ROOT}/{documentId}`)
  .onCreate(event => {
    console.log(event.data.val());

    const url = `${OUTGOING_WEBHOOK}?message=${encodeURIComponent(event.data.val())}`;
    return request(url)
      .then(response => true)
      .catch(err => {
        console.log(err);
        return Promise.reject(err);
      });
  });
