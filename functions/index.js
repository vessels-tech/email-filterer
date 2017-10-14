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
 * Get all of the rules, for now just a simple list of strings
 *
 * @returns Promise<list>
 */
const getRules = () => {
  return admin.database().ref(RULES_ROOT).once('value')
  .then(snapshot => {
    const allRules = snapshot.val();
    filterIn = Object.keys(allRules).map(key => {
      return allRules[key];
    });

    return filterIn;
  });
};

/**
 * Get all of the unfiltered email
 *
 * @returns Promise<Object>
 */
const getUnfilteredMail = () => {
  return admin.database().ref(UNFILTERED_ROOT).once('value')
  .then(snapshot => snapshot.val());
}


/**
 * Called to trigger a database check.
 *
 */
exports.triggerCheckEmail = functions.https.onRequest((req, res) => {
  let filterIn = null;

  return getRules()
  .then(_filterIn => filterIn = _filterIn)
  .then(() => getUnfilteredMail())
  .then(allValues => {
    const important = [];
    const boring = [];

    console.log('All values: ', allValues);
    const keys = Object.keys(allValues);

    keys.forEach(key => {
      const value = JSON.stringify(allValues[key]).toLowerCase();
      console.log('Value is: ', value);

      let isImportant = false;
      filterIn.forEach(filter => {
        if (value.indexOf(filter) > -1) {
          isImportant = true;
        }
      });

      if (isImportant) {
        important.push(value);
        console.log("this email is important");
      } else {
        boring.push(value);
        console.log("this email is boring");
      }
    });

    const summaryString = `You have *${important.length}* important, and *${boring.length}* boring emails.`;
    return admin.database().ref(AGGREGATE_ROOT).push().set(summaryString);
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
  //
  //
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
