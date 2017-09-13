const smsRadio = document.getElementById('sms-radio');
const smsSlider = document.getElementById('sms-slider');
const smsYes = document.getElementById('sms-yes');
const smsNo = document.getElementById('sms-no');
let smsProcessing = false;

smsSlider.addEventListener('click', (event) => {
    event.preventDefault();
    if(!smsProcessing) {
      smsProcessing = true;
      smsRadio.checked ? smsRadio.checked = false : smsRadio.checked = true;
      smsNo.classList.toggle('hide');
      smsYes.classList.toggle('hide');
      //smsRadio.disabled = true;
      toggleSMSopt()
      .then(() => {
        smsProcessing = false;
        console.log('smsOpt success');
        //smsRadio.disabled = false;
      }) 
      .catch((err) => {
        console.log('smsOpt error: ',err);
      })
    } 
    return true;
  });

  function toggleSMSopt() {
    /* 
      Trigger post request to server to toggle the user's preference 
      for receiving sms messages.
    */
    let smsChange = {
      optIn : smsRadio.checked
    }

    return new Promise((res, rej) => {
      axios.post('/user/api/sms-opt', smsChange )
      .then(() => {
        console.log('sent post req');
        res();
      })
      .catch((err) => {
        console.log('post req error');
        rej(err);
      });
      // setTimeout(() => {
      //   res();
      // }, 8000);
    });
  }