    
  let volOpts = {
    orgURL: 'http://www.casatravis.org',
    image: 'http://www.casatravis.org/images/template/logo-300x.png',
    hashtag: '#casatravis'
  }
  const fbQuote = document.getElementById('fb-quote');
  updateMetaTags(volOpts)
  .then(fbQuote.setAttribute('data-href',volOpts.orgURL))
  .then((function(d, s, id) {
      let js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.6";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk')));




function updateMetaTags(optionsObject){
  let descrip = document.createElement('meta');
  descrip.setAttribute('property', 'og:description');
  descrip.content = optionsObject.description || '';
  let title = document.createElement('meta');
  title.setAttribute('property','og:title');
  title.content = optionsObject.title || '';
  let orgURL = document.createElement('meta');
  orgURL.setAttribute('property', 'og:url');
  orgURL.content = optionsObject.orgURL || 'http://www.facebook.com';
  let image = document.createElement('meta');
  image.setAttribute('property','og:image');
  image.content = optionsObject.image || '';
  const head = document.getElementsByTagName('head')[0];
  head.appendChild(descrip);
  head.appendChild(title);
  head.appendChild(orgURL);
  head.appendChild(image);
  return Promise.resolve(true);
}
