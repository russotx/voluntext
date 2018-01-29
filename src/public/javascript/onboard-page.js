const email = document.getElementById('email-field');
const pwd1 = document.getElementById('pwd1-field');
const pwd2 = document.getElementById('pwd2-field');
const phone = document.getElementById('phone-field');
const submit = document.getElementById('submit-btn');
const messages = document.getElementById('messages');
const onboardForm = document.getElementById('onboard-form');

function validateEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validatePhone(phone) {
  const usPhoneDigits = 10;
  let barePhone = phone.replace(/\D/g,'');
  if (barePhone.length !== usPhoneDigits) {
    return false;
  } 
  if (barePhone[0] === '0') { 
    return false;
  }
  return true;
}

function validateOnboard() {
  return new Promise ((res,rej) =>{
    if (!validateEmail(email.value)) {
      email.value = "enter a valid email";
      email.classList.add('bad-input');
      rej("invalid email input");
    }
    if (!((pwd1.value) && (pwd2.value)) || ((!(pwd1.value === pwd2.value)))) {
      pwd1.classList.add('bad-input');
      pwd2.classList.add('bad-input');
      pwd1.value = "must enter matching passwords";
      pwd2.value = "must enter matching passwords";
      rej("invalid password input");
    }
    if (!(phone.value)) {
      phone.value = "phone number required";
      phone.classList.add('bad-input');
      rej("invalid phone input");
    } else if (!validatePhone(phone.value)) {
      phone.value = "invalid phone number";
      phone.classList.add('bad-input');
      rej("invalid phone input");
    }
    res({
      email : email.value,
      password1 : pwd1.value,
      password2 : pwd2.value,
      phone : phone.value.replace(/\D/g,'')
    });
  }); 
}

onboardForm.addEventListener('focus', (event) => {
  console.log(event.target);
  if ((event.target.type == 'password') && 
      (event.target.classList.contains('bad-input'))) {
    pwd1.classList.remove('bad-input');
    pwd1.value = '';
    pwd2.classList.remove('bad-input');
    pwd2.value = '';
  }
  if ((event.target.type == 'text') &&
      (event.target.classList.contains('bad-input'))) {
    event.target.classList.remove('bad-input');
    event.target.value = '';
  }
}, true)

submit.addEventListener('click', (event) => {
  event.preventDefault();
  validateOnboard()
  /* valid user data */
  .then((onboardData) => {
    axios.post('/admin/api/onboard', onboardData)
    .then((result) => {
      console.log(result);
      onboardForm.reset(); 
      email.value = "User added!";
      return true;
    })
    .catch((err) => {
      console.log('error submitting user data');
      messages.textContent = "error submitting user data";
      return false;
    })
  })
  /* invalid user data catch */
  .catch((err)=>{
    console.log('user data invalid', err);
    return false;
  });
});