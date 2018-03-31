// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

$(function() {

  $('form').submit(function(event) {
    event.preventDefault();
    var long_url = $('#long_url').val();
    console.log(long_url);
    var getUrl = "https://url-squasher.glitch.me/new/" + long_url;
    console.log(getUrl);
    $.get(getUrl, (data)=> {
      $("#shortened_url").text("https://url-squasher.glitch.me/" + data.url_id);
    });
  })

})
