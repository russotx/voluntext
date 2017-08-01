/*************************************************
        AUTHENTICATION (Logout/Redirect)
*************************************************/

let fbHours;

// On click posts to calls function to post to currently logged in Facebook user
document.getElementById("post").onclick = function(event){
  event.preventDefault();
  fbHours = $("#myHours").val();
  submitHours();
  post();
}


//  Posts to facebook
function post() {
  FB.login(function(){FB.api('/me/feed', 'post', {message: "I Volunteered "+ fbHours +" hours at the Miracle Foundation!" });}, {scope: 'publish_actions'});
}


document.getElementById("logout").onclick = function(event){
  event.preventDefault();
  logout();
}

    
firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      window.location = "/login";
    }
  }
);

function logout() {
  firebase.auth().signOut()
    .then(function() {}, function(error) {
      console.log(error);
    });
}

/*********************************************
        DOM Code
*********************************************/
let db = firebase.database();
let theDB;
let userKey;
let name;
let phone;
let startDate;
let inputHours = 0;
let hours = 0;
let theUser = '';

// Get key for current user

db.ref().once('value')
  .then(function(snapshot) {
    theDB = snapshot.val();
    theUser = theDB.currentlogin;  
  }).then(function() {
      // console.log(theUser);
      userKey = getVolKey(theUser, theDB);
    }).then(function() {
      // console.log(userKey);
      name = theDB.Volunteers[userKey].name;
      // console.log(name);
      phone = theDB.Volunteers[userKey].phone;
      // console.log(phone);
      startDate = theDB.Volunteers[userKey].startDate;
      // console.log(startDate);
      hours = theDB.Volunteers[userKey].totalHours;
      // $("tbody").append("<tr class='temp'><td class='temp'>"+name+"</td><td class='temp'>"+phone+"</td><td id='hours' class='temp'>"+hours+"</td><td class='temp'>"+startDate+"</td></tr>");
    });

db.ref().on('value',function(snapshot){
  // console.log("hello");
  let dbImage = snapshot.val();
  let theUser = dbImage.currentlogin;  
  userKey = getVolKey(theUser, dbImage);
  $('tbody').find('.temp').remove();
  let vTr = $('<tr>');
  let vName = $('<td class="temp">');
  let vPhone = $('<td class="temp">');
  let vTotal = $('<td class="temp">');
  let vStart = $('<td class="temp">');
  vName.html(dbImage.Volunteers[userKey].name);
  vPhone.html(dbImage.Volunteers[userKey].phone);
  vStart.html(dbImage.Volunteers[userKey].startDate);
  if (dbImage.Volunteers[userKey].totalHours != undefined) {
    vTotal.html(dbImage.Volunteers[userKey].totalHours);
  } else {
      vTotal.html('none');
    }
  vTr.append(vName);
  vTr.append(vPhone);
  vTr.append(vTotal);
  vTr.append(vStart);
  $('tbody').append(vTr);
});



// Click function to add the hours collected to totalHours in Firebase
$("#submit").on('click', function(){
  submitHours();
  document.getElementById("myHours").value = "";
  document.getElementById("month").value = "";
  document.getElementById("day").value = "";
  document.getElementById("year").value = "";
  document.getElementById("month").value = "";
  document.getElementById("day").value = "";
  document.getElementById("year").value = "";

});


//Get the current user's key
function getVolKey(email, snap) {
  let emailToKey = function(inputEmail) {
    let converted = (inputEmail).split('.').join('*');
    return converted;
  };
  let volKeyEmail = emailToKey(email.toLowerCase());
  let volKey = snap.volsByEmail[volKeyEmail];
  return volKey;
}

/*****************************************
*
*    VOLUNTEER FUNCTIONS
* 
******************************************/

// submit hours manually online
function submitHours(){
  // need Email, Hours, begin date, end date
  let volHours = fieldData.grabSet('my-hours');
  let beginM = volHours[1];
  let beginD = volHours[2];
  let beginY = volHours[3];
  let endM = volHours[4];
  let endD = volHours[5];
  let endY = volHours[6]; 
  let formSelector = $('.my-hours');
  // console.log('the vol hours: '+volHours);
  // validate the input dates for hours
  if (
      (validateDate(formSelector,beginM)) && (validateDate(formSelector,beginD)) && 
      (validateYear(formSelector,beginY)) && (validateDate(formSelector,endM)) && 
      (validateDate(formSelector,endD)) && (validateYear(formSelector,endY))
     ) {
          recordVolHours(volHours);
       }
}

function validateDate($jqSelector,mmORdd) {
  function isDateValidFunc(mmORdd) {
    if (mmORdd.length !== 2) {
      return false;
    } else {
        for (let x = 0; x < mmORdd.length; x++) {
          if (isNaN(parseInt(mmORdd[x],10)) || (mmORdd.length !== 2)) {
            return false;
          }
        }
        return true;
      }
  }
    if (!isDateValidFunc(mmORdd)) {
      $jqSelector.css("background-color","#FFA8A8");
      $jqSelector.val("MMDDYYYY");  
      return false;
    }
    return true;
}

function validateYear($jqSelector,yyyy) {
  function isDateValidFunc(yyyy) {
    if (yyyy.length !== 4) {
        return false;
    } else {
        for (let x = 0; x<yyyy.length; x++) {
          if (isNaN(parseInt(yyyy[x],10))) {
            return false;
          }
        }
      }
    return true;
  }
  if (!isDateValidFunc(yyyy)) {
    $jqSelector.css("background-color","#FFA8A8");
    $jqSelector.val("MMDDYYYY");  
    return false;
  }
  return true;
}

// records volunteer hours to the database
// volData = [ 0:hours, 1:begindate m, 2:begindate d, 3: begindate y, 4: enddate m, 5: enddate d, 6: enddate y]
function recordVolHours(volData) {
  console.log('the volunteer data: '+volData);
  // need the volunteer's key to access them in the DB
  let volKey;
  let volExistingHrs = 0;
  // turn hours into an integer
  let intHours = parseInt(volData[0],10);
  db.ref().once('value')
    .then(function(snapshot) {
      let theDB = snapshot.val();
      let userEmail = theDB.currentlogin;
      volKey = getVolKey(userEmail,theDB);
      console.log('volunteer key: '+volKey);
      console.log(theDB[volKey]);
      if (theDB.Volunteers[volKey].totalHours != undefined) {
        // get the total hours if they exist
        volExistingHrs = parseInt(theDB.Volunteers[volKey].totalHours,10);
      } else {
          volExistingHrs = 0;   
        }
      // get today's date as string 'mm-dd-yyyy'
      let submissionDate = getToday();
      let begin = volData[1]+'-'+volData[2]+'-'+volData[3];
      let end = volData[4]+'-'+volData[5]+'-'+volData[6];
      let newSubmission = {};
      // add new hours to total hours
      let totalHours = volExistingHrs+intHours; 
      newSubmission['/Volunteers/'+volKey+'/totalHours/'] = totalHours;
      // add the last updated hours
      newSubmission['/Volunteers/'+volKey+'/lastUpdateHours/'] = intHours;
      // submit the end date from the volunteer's submit period
      newSubmission['/Volunteers/'+volKey+'/lastUpdateDate/'] = submissionDate;
      // add the submission to the log
      newSubmission['/Volunteers/'+volKey+'/log/'+begin+':'+end+'/'] = intHours;  
      db.ref().update(newSubmission);    
    });
}

// get today as 'mm-dd-yyy'
function getToday() {
  let today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth()+1; //January is 0!
  let yyyy = today.getFullYear();
  if(dd<10) {
    dd='0'+dd;
  } 
  if(mm<10) {
    mm='0'+mm;
  } 
  today = mm+'-'+dd+'-'+yyyy;
  return today;
}

/******************************************
*
*   fieldData Object: 
*    - handles grabbing data from
*    - form fields
* 
*******************************************/

// object of methods for dealing with form field data without jQuery
let fieldData = {
  // returns string of data from an input element matching id, does not need #
  grabById : function(id) {
    let targetId = '#' + id;
    let targetField = document.querySelector(targetId);
    return targetField.value;
  },
  // returns an array of input from a select group of fields matching the parameter
  // requires prepend parameter with . for class, # for id. '[name="nameString"]' etc.
  grabSet : function(className) {
    let userInputArray = [];
    let i = 0;
    while (document.getElementsByClassName(className)[i] != null) {
      let userInput = document.getElementsByClassName(className)[i].value;    
      userInputArray.push(userInput);
      i++;    
    }
    return userInputArray;
  },
  // returns an object containing all the data matching the fields with the
  // selector
  fieldsToObject : function(selector) {
      let userInputObj = document.querySelectorAll('input '+selector);
      return userInputObj;
  },
  // returns an array of all the data from every input field on a page 
  grabAll : function() {
    let userInputArray = [];
    let i = 0;
    while (document.getElementsByTagName('input')[i] != null) {
      let userInput = document.getElementsByTagName('input')[i].value;    
      userInputArray.push(userInput);
      i++;    
    }
    return userInputArray;
  },
  // clears all input elements on the page
  clearAll : function() {
    let i = 0;
    while (document.getElementsByTagName('input')[i] != null) {
      document.getElementsByTagName('input')[i].value = "";    
      i++;    
    }     
  },
  // clears an input element with matching id
  clearById : function(id) {
    let targetId = '#' + id;
    let targetField = document.querySelector(targetId);
    targetField.value = "";    
  }
} //.... end of fieldData object.