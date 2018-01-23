// JS for login page
let user;

let provider = new firebase.auth.FacebookAuthProvider();

let database = firebase.database();

document.getElementById("signIn").onclick = function(event){
  event.preventDefault();
  authenticateUser();
  console.log("Clicking Works");
  }

document.getElementById("logout").onclick = function(event){
  event.preventDefault();
  logout();
  }

function logout () {
  firebase.auth().signOut().then(function() {
  }, function(error) {
  console.log(error);
  });
}


function authenticateUser() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password).then(function (user) {
     //debugging purpose
    }).catch(function (error) {
      // Handle Errors here.
      let errorCode = error.code;
      let errorMessage = error.message;
      console.log(errorMessage);
      if (errorCode === 'auth/wrong-password') {
        alert('Sorry, but the password was incorrect.');
      } else {
        alert(errorMessage);
        } 
    });
  }


firebase.auth().onAuthStateChanged(function(user) {
  if (user) { 
    user = (user);
    console.log (user.email);
    database.ref().update({currentlogin : user.email});
    test(user);
  }
});

function test (user) {

  console.log(user.providerData[0].providerId);
  console.log(user.providerData.length);

  // if user has linked account with facebook they are redirected
  if (user.providerData[0].providerId === "facebook.com") {
    console.log("yep");
    console.log(user.providerData.length);
    window.location = "/index";
    // if user hasn't linked facebook account they will be redirected to facebook to link it
  } else if (user.providerData.length === 1) { 
      user.linkWithRedirect(provider).then(function(result) {
        console.log("yes");
        window.location = "/index";
        // Credential is facebook token
        let credential = result.credential;
        }, function(error) {
          console.log(error);
          });
      }
  }




