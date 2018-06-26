define([
  'dojo/_base/declare', 
  'jimu/BaseWidget',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/on',
  'dojo/_base/lang',
  'dojo/request'],
  function(declare, BaseWidget, _WidgetsInTemplateMixin, on, lang,
           request) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-kmloader',
      name: 'KMLoader',

      // Widget's visual elements
      form: null,
      fileSelect: null,
      uploadButton: null,

      // Other
      token: 'My Token',

      /**
       * Cache widget's form elements.
       */
      startup: function() {
        this.form = document.getElementById('file-form');
        this.fileSelect = document.getElementById('file-select');
        this.uploadButton = document.getElementById('upload-button');
      },

      /**
       * Generate user token and set handler for form submission.
       */
      onOpen: function() {
        this._generateToken()
        .then(token => {
          on(this.form, 'submit', lang.hitch(this, this._onFormSubmit, token));
          this.submitBtn.removeAttribute('disabled');
        })
      },

      /**
       * Generate token for user to enable arcgis rest api actions.
       * 
       * @return {Promise} the promise resolves to the token generated
       */
      _generateToken: function() {
        return fetch('https://www.arcgis.com/sharing/rest/generateToken', {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: 'username=*****&password=*****&f=json&referer='+encodeURIComponent('http://localhost:3345')
        })
        .then(res => res.json())
        .then(res => {
          this.token = res.token

          return this.token
        });
      },

      /**
       * Handle form submission.
       * 
       * @param token the user token generated
       * @param e form submit event
       */
      _onFormSubmit: function(token, e) {
        e.preventDefault();

        // get list of files
        var files = this.fileSelect.files;

        // continue only if the user select one (or more) files
        if (files.length > 0) {
          this.uploadButton.innerHTML = "Uploading..";

          var file = files[0];

          fetch('https://www.arcgis.com/sharing/rest/content/users/*****/addItem', {
            method: 'post',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: 'token='+encodeURIComponent(token)+'&f=json&title='+encodeURIComponent(file.name)+'&type=KML&filename='+encodeURIComponent(file.name)+'&multipart='+encodeURIComponent(true)
          })
          .then(res => res.json())
          .then(res => {
            return new Promise(resolve => {
              var id = res.id;

              var fileReader = new FileReader();

              // when finish to read the file, make request with the content of the file
              fileReader.onload = (e) => {
                let data = e.target.result;

                fetch('https://www.arcgis.com/sharing/rest/content/users/****/items/'+id+'/addPart', {
                  method: 'post',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                  },
                  body: 'token='+token+'&f=json&partNum=1&file='+encodeURIComponent(data)
                })
                .then(res => resolve(res));
              }

              // read file content
              fileReader.readAsText(file);
            });
          })
          .then(res => res.json())
          .then(res => {
            console.log(res);
            if (res.success) {
              return fetch('https://www.arcgis.com/sharing/rest/content/users/*****/items/'+id+'/commit', {
                method: 'post',
              });
            } else {
              return null;
            }
          })
          .then(res => {
            if (res) {
              return res.json();
            } else {
              return undefined;
            }
          })
          .then(res => {
            console.log(res);
          });
        }
      }
    });
  });