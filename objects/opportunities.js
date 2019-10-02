function globalOpportunityChange({record, changes, action, view, previous}) {
  try {
    let data = {}
    let isStatusUpdated = changes.includes('field_127')
    let isQuoteStatusUpdated = changes.includes('field_1606')

    // Record the status change date
    if (isStatusUpdated) {
      data.field_1609 = {
        "date": moment().format("DD/MM/YYYY"),
      }
      // Has status become 'To Quote'?
      if (record.field_127 !== "Pending Review" && record.field_127 === "To Quote") {
        // User can set quote status during transition from Pending Review back to Quote
        data.field_1606 = "Open" // Set the 'Quote Status' to Open
      }
    }
    // Record the date the quoted status changed (eg Open/Pending)
    if (isQuoteStatusUpdated) {
      data.field_1610 = {
        "date": moment().format("DD/MM/YYYY"),
      }
    }

    // Process notes if these have been added
    if (record.field_1665.length>0){
      data.field_126 = record.field_1665 //copy this note to the last note field
      data.field_1665 = '' // clear the note
      let isNewOpp = action === 'Create' ? true : false
      handleOppNotes(record, isNewOpp, view, previous, changes)
    }

    // Update the opportunity
    if (!$.isEmptyObject(data)) {
      let opportunityObj = new KnackObject(objects.opportunities)
      opportunityObj.update(record.id, data)
    }

  } catch (err) {
    Sentry.captureException(err)
  }
}

const opportunityUpdatedEvents = [
  'knack-record-create.view_934', //https://builder.knack.com/lovelight/tracker#pages/scene_413/views/view_934
  'knack-record-create.view_1542', //https://builder.knack.com/lovelight/tracker#pages/scene_691/views/view_1542, //https://lovelight.knack.com/tracker#opportunities/new-quote-request/
  'knack-form-submit.view_1069', //https://builder.knack.com/lovelight/tracker#pages/scene_475/views/view_1069
  'knack-form-submit.view_87', //https://builder.knack.com/lovelight/tracker#pages/scene_49/views/view_87
  'knack-form-submit.view_949', //https://builder.knack.com/lovelight/tracker#pages/scene_414/views/view_949
  'knack-form-submit.view_950', //https://builder.knack.com/lovelight/tracker#pages/scene_415/views/view_950
  'knack-form-submit.view_1023', //https://builder.knack.com/lovelight/tracker#pages/scene_455/views/view_1023
  'knack-form-submit.view_1024', //https://builder.knack.com/lovelight/tracker#pages/scene_456/views/view_1024
  'knack-form-submit.view_1661', //https://builder.knack.com/lovelight/tracker#pages/scene_456/views/view_1661
]

$(document).on(opportunityUpdatedEvents.join(' '), function(event, view, record) {
  processOpportunityChanges(record);
});

//https://builder.knack.com/lovelight/tracker#pages/scene_691/views/view_1542
//https://lovelight.knack.com/tracker#opportunities/new-quote-request/
$(document).on('knack-record-create.view_1542', function(event, view, record) {
  triggerZap('lq798w', record, 'new quote request')
});

function processOpportunityChanges(record) {

  //Set variables
  var quotedNotificationValue = 50000;
  var saleNotificationValue = 10000;

  //Gather required data & variables

  //If we have to update the opportuinty, we'll need this:
  var updateOpp = {};
  updateOpp.field_258 = record.field_127; //set's the previous status field to the current status, removing the 'has chagned' flag

  //Set general variables to use in code below and make it more readable
  var status = record.field_127;
  var statusPrevious = record.field_258;
  var statusChanged = record.field_259;
  var value = record.field_128.length > 0 ? parseInt(record.field_128_raw.replace(/\,/g, '')) : undefined;
  var salesPerson = record.field_1274.length > 0 ? record.field_1274_raw["0"].identifier : undefined;
  var quotedBy = record.field_1275.length > 0 ? record.field_1275_raw["0"].identifier : salesPerson;
  var company = record.field_1460.length > 0 ? record.field_1460_raw["0"].identifier : undefined;
  var state = record.field_117;

  //If we need to trigger zaps, they'll need this information
  var zapierData = {};
  zapierData.status = status;
  zapierData.opportunity = record.field_123_raw;
  zapierData.value = value;
  zapierData.value_formatted = record.field_128_raw ? record.field_128_raw.split(".")[0] : value
  zapierData.salesPerson = salesPerson;
  zapierData.quotedBy = quotedBy;
  zapierData.company = company;
  zapierData.salesPersonCredit = `${salesPerson} & ${quotedBy}`

  console.log(status, statusPrevious, statusChanged, value, salesPerson, quotedBy, company);

  if (statusChanged == 'Yes') {

    //Has this opportunity just been quoted?
    if (status == 'Open' && statusPrevious !== 'Lost' && statusPrevious !== 'Won' && value >= quotedNotificationValue && typeof quotedBy !== 'undefined') {
      //Send to Zapier for Slack update
      triggerZap('l5tgdk', zapierData, 'Quote!');
    }

    if (status == 'Won') {
      //Add closed date to opportunity update object
      updateOpp.field_132 = moment().format("DD/MM/YYYY h:mm a");
      //console.log("status Changed to won "+ updateOpp.field_132);

      if (value >= saleNotificationValue) {

        // If Jem is the sales person update the credit field to the ops person
        if (salesPerson.indexOf('Jeremy') > -1) zapierData.salesPersonCredit = quotedBy

        //Send to Zapier for Slack update
        triggerZap('l5tx9j', zapierData, 'Sale!');

      }

      //Notify QLD channel about all wins
      if (state == 'QLD' && value < saleNotificationValue) {
        zapierData.salesPersonCredit = salesPerson;
        triggerZap('e337ri', zapierData, 'QLD Sale!');
      }

      //Does this opportunity have a company?
      if (typeof company !== 'undefined') {

        //console.log("there is a company");
        triggerZap('l5hoyo', zapierData, 'Opportunity has a company');

      } //end company
    } //end won

    //The status has changed. Set previous status to current status to reset the flag
    updateRecordPromise('object_17', record.id, updateOpp)

  } //end status changed
}

function handleOppNotes(opportunity, isNewOpp, view, previous, changes) {
  try {
    let user = Knack.getUserAttributes()
    let isThereANote = isOppNoteAdded(opportunity)
    let isStatusUpdated = isOppStatusUpdated(changes)
    let isValueUpdated = isOppValueUpdated(changes)
    let notes = []
    let data = {}

    data.field_1655 = user.name // Create by
    data.field_1663 = [opportunity.id]

    if (isNewOpp) {
      // Insert opportunity created record
      data.field_1659 = ['5d95285fd76c0c0010a707d3'] // Opp Created
      data.field_576 = `Opportunity created from ${view.name} form`
      notes.push(JSON.parse(JSON.stringify(data)))
    }

    if (isThereANote) {
      // Insert a note record
      data.field_1659 = ['5d8c078bdb00f0001095e39d'] // Note
      data.field_576 = opportunity.field_1665 // Note details
      notes.push(JSON.parse(JSON.stringify(data)))
    }

    if (isStatusUpdated) {

      if(opportunity.field_127 === 'Won' || opportunity.field_127 === 'Won as SWP'){

        data.field_1659 = ['5d9528dad76c0c0010a70955'] // Opportunity Won
        data.field_576 = `Opportunity Won! ${opportunity.field_139} days from quote to close.`
        notes.push(JSON.parse(JSON.stringify(data)))

      } else if(opportunity.field_127 === 'Lost'){

        data.field_1659 = ['5d9528bfe83dee00109dd2bd'] // Opportunity Lost
        data.field_576 = `Opportunity Lost. ${opportunity.field_139} days from quote to close.`
        notes.push(JSON.parse(JSON.stringify(data)))

      } else {
          // Insert a status change record
          data.field_1659 = ['5d8c0d5622d07d0010b41b9e'] // Status Change
          data.field_576 = `Status changed from ${previous.field_127} to ${opportunity.field_127}`
          notes.push(JSON.parse(JSON.stringify(data)))
      }

    }

    if (isValueUpdated) {
      // Insert a value change record
      data.field_1659 = ['5d8c0e42ca31bf0010deb365'] // Value Change
      data.field_887 = 'Value Changed' // Delete this field once migration is complete
      data.field_576 = `Opportunity value changed from ${previous.field_128} to ${opportunity.field_128}`
      notes.push(JSON.parse(JSON.stringify(data)))
    }

    // Insert the notes if there are any
    if (notes.length > 0) addActivityRecords(notes)
  } catch (err) {
    Sentry.captureException(err)
  }

}

function isOppStatusUpdated(changes) {
  if (changes.includes('field_127')) return true
  return false
}

function isOppValueUpdated(changes) {
  if (changes.includes('field_128')) return true
  return false
}

function isOppNoteAdded(opportunity) {
  if (opportunity.field_1665.length > 0) return true
  return false
}
