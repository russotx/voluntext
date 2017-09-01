const email = document.getElementById('email-field');
const pwd1 = document.getElementById('pwd1-field');
const pwd2 = document.getElementById('pwd2-field');
const phone = document.getElementById('phone-field');
const submit = document.getElementById('submit-btn');

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateOnboard() {
  return new Promise ((res,rej) =>{
    if (!validateEmail(email.value)) {
      email.value = "enter a valid email";
      email.classList.add('bad-input')
      rej("invalid email input")
    }
    if (!((pwd1.value) && (pwd2.value)) || ((!(pwd1.value === pwd2.value)))) {
      pwd1.classList.add('bad-input')
      pwd2.classList.add('bad-input')
      pwd1.value = "must enter matching passwords"
      pwd2.value = "must enter matching passwords"
      rej("invalid password input")
    }
    if (!(phone.value)) {
      phone.value = "phone number required"
      phone.classList.add('bad-input')
      rej("invalid phone input")
    }
    res({
      email : email.value,
      pwd1 : pwd1.value,
      pwd2 : pwd2.value,
      phone : phone.value
    })
  })  
}

submit.addEvenListener('click',(event) => {
  event.preventDefault();
  validateOnboard()
    .then((onboardData)=>{
      axios.post('/admin/api/onboard',onboardData)
    })
    .catch()
  
    
    
})