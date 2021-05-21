import {
  domify,
  event as domEvent
} from 'min-dom';

import {
  fileReader
} from '../../util/FileUtil.js';

import {
  getMousePosition
} from '../../util/ScreenUtil.js';

var LOW_PRIORITY = 500;
var text;

export default function ImageSelection(canvas, eventBus, modeling, translate) {

  this._canvas = canvas;
  this._eventBus = eventBus;
  this._modeling = modeling;
  this._translate = translate;

  var self = this;

  eventBus.on('create.end', LOW_PRIORITY, function(event) {
    var context = event.context,
        element = context.shape,
        hints = context.hints;

    if (hints.selectImage) {
      self.select(element);
    }
  });

  text = { 'URL': this._translate('URL'),
    'An error occured during the file upload': this._translate('An error occured during the file upload'),
    'Upload files here': this._translate('Upload files here'),
    'Upload': this._translate('Upload'),
    'file': this._translate('file'),
    'files': this._translate('files'),
    'selected': this._translate('selected'),
    'Upload again': this._translate('Upload again'),
  };

  ImageSelection.IMAGE_SELECTION_MARKUP = '<div id="pjs-image-selection-modal" class="pjs-io-dialog-local">'+
    '<div class="pjs-io-dialog-section pjs-first">'+
      '<div id="pjs-image-selection-input-wrapper"><input id="pjs-image-selection-input" class="pjs-ui-element-bordered"></input></div>'+
      '<div class="pjs-labeled-input">'+
      '<label for="pjs-image-selection-input" class="pjs-input-text-static"><!--Search / -->'+text['URL']+':</label>'+
      '</div>'+
    '</div">'+
    '<div class="pjs-io-dialog-section">'+
    '<div class="pjs-section-spacer"></div>'+
    '<label for="pjs-image-upload"><div class="pjs-io-dialog-text-hint">'+
      '<a style="display:block"><ul id="pjs-image-dialog-text-hint-list" class="pjs-horizontal">'+
        '<li><div class="pjs-general-icon pjs-image-dialog-upload-icon"></div></li>'+
        '<li id="pjs-image-selection-files-text-error">'+text['An error occured during the file upload']+'</li>'+
        '<li id="pjs-image-selection-files-text-upload">'+text['Upload files here']+'</li>'+
      '</ul></a>'+
    '</div></label>'+
    '<input type="file" id="pjs-image-upload" style="display:none" multiple/>'+
    '<div class="pjs-io-dialog-section">'+
    '<div class="pjs-buttons pjs-image-selection-submit-wrapper"><button id="pjs-image-selection-submit">'+text['Upload']+'</button></div>'+
    '</div>'+
    '</div>'+
  '</div>';

}

ImageSelection.prototype._getParentContainer = function() {
  return this._canvas.getContainer();
};

ImageSelection.prototype.select = function(element, callback) {

  const self = this;

  const container = this._container = domify(ImageSelection.IMAGE_SELECTION_MARKUP);

  const canvas = this._canvas._container.parentElement.parentElement;
  canvas.insertBefore(container, canvas.firstChild);

  const mousePosition = getMousePosition(null);
  container.style.left = ( mousePosition.pageX - getOffsetLeft(container) ) + 'px';
  container.style.top = ( mousePosition.pageY - getOffsetTop(container) ) + 'px';

  const inputField = document.getElementById('pjs-image-selection-input'),
        submitButton = document.getElementById('pjs-image-selection-submit'),
        imageUploadTextError = document.getElementById('pjs-image-selection-files-text-error'),
        imageUploadTextUpload = document.getElementById('pjs-image-selection-files-text-upload'),
        imageUploadTextList = document.getElementById('pjs-image-dialog-text-hint-list'),
        imageUploadReader = document.getElementById('pjs-image-upload'),
        modal = document.getElementById('pjs-image-selection-modal');

  var uploadTextListHeight = imageUploadTextList.style.height;

  var source, filesToUpload;

  // focus url input field on modal open
  inputField.focus();

  // remove modal by clicking anywhere else
  const canvasDefaultClick = domEvent.bind(canvas, 'click', function(ev) {
    if (modal) {

      // If we clicked one of our update buttons, don't close the dialog.
      var isBtn = false;
      document.querySelectorAll('.djs-context-pad .entry').forEach( function(btn) {
        if (btn == event.target ) {
          isBtn = true;
        }
      });

      const mousePos = getMousePosition(ev);

      // The dialog is displaced by a box the size of font-size on each edge.
      var fontSize = document.defaultView.getComputedStyle(modal)['font-size'];
      fontSize = parseInt(fontSize.substring(0, fontSize.indexOf('px')));
      if (!isBtn && (
          (mousePos.pageX > modal.offsetLeft+getOffsetLeft(canvas)+modal.clientWidth
          || mousePos.pageX < modal.offsetLeft+getOffsetLeft(canvas) - fontSize)
          || (mousePos.pageY > modal.offsetTop+getOffsetTop(canvas)+modal.clientHeight
          || mousePos.pageY < modal.offsetTop+getOffsetTop(canvas) - fontSize) )) {
        removeImageSelectionModal();
      }
    }
  });


  for (var i=0; i < imageUploadReader.labels.length; i++) {
    // open file dialog
    domEvent.bind(imageUploadReader.labels[i], 'click', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      
      imageUploadReader.dispatchEvent(new MouseEvent(ev.type, ev));
    });
  }

  // after we open file dialog
  domEvent.bind(imageUploadReader, 'change', async function() {
    inputField.disabled = 'true';

    let uploadDisplayText;

    let uploadResultObj = await fileReader(null, imageUploadReader.files),
        uploadResult = uploadResultObj.uploadResult,
        errors = uploadResultObj.errors;

    if (!errors) {
      let uploadedFilesCount = (uploadResult.length) ? uploadResult.length : 0;
      uploadDisplayText = uploadedFilesCount;

      if (isNaN(uploadedFilesCount) === false) {

        const filePluralText =+ (uploadResult.length == 1) ? text['file'] : text['files'];
        uploadDisplayText += ' ' + filePluralText + ' ' + text['selected'];

        // uploaded files are saved in global var
        filesToUpload = uploadResult;
      }

      displayUploadStaging(uploadDisplayText);
    } else {
      displayError();
    }
  });

  // upload button
  domEvent.bind(submitButton, 'click', async function() {
    source = filesToUpload;

    // (1) call from canvas, providing a target element
    if (element !== null) {

      // (1.1) local file selection upload
      if (source) {
        for (const f in filesToUpload) {
          uploadImage(self, filesToUpload[f]);
        }

      // (1.2) url upload
      } else {
        source = inputField.value;
        uploadImage(self, source);
      }

      self._eventBus.fire('imageSelection.complete', { element: element });

    // (2) external call w/o canvas target
    } else {

      // (2.1 default) local file selection data is used

      // (2.2) url upload
      if (!source) {
        source = inputField.value;
      }

      callback(source);
    }

    // error handling not necessary as default img will be shown in error situation
    removeImageSelectionModal();
  });

  // enter pressed
  domEvent.bind(inputField, 'keyup', function(esvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      submitButton.click();
    }
  });

  function getOffsetLeft(elem) {
    var offsetLeft = 0;
    do {
      if ( !isNaN( elem.offsetLeft ) )
      {
          offsetLeft += elem.offsetLeft;
      }
    } while( elem = elem.offsetParent );
    return offsetLeft;
  }

  function getOffsetTop(elem) {
    var offsetTop = 0;
    do {
      if ( !isNaN( elem.offsetTop ) )
      {
          offsetTop += elem.offsetTop;
      }
    } while( elem = elem.offsetParent );
    return offsetTop;
  }

  function displayUploadStaging(text) {
    imageUploadTextList.style.height = uploadTextListHeight;
    imageUploadTextError.style.display = 'none';
    imageUploadTextUpload.innerHTML = text;

    if (document.getElementsByClassName('pjs-image-dialog-upload-icon').length > 0) {
      document.getElementsByClassName('pjs-image-dialog-upload-icon')[0].classList.remove('pjs-image-dialog-upload-icon-error');
    }
  }

  function displayError() {
    uploadTextListHeight = imageUploadTextList.style.height;

    imageUploadTextList.style.height = 'auto';
    imageUploadTextError.style.display = 'block';
    imageUploadTextUpload.innerHTML = text['Upload again'];

    document.getElementsByClassName('pjs-image-dialog-upload-icon')[0].classList.add('pjs-image-dialog-upload-icon-error');
  }

  async function uploadImage(self, source) {
    var urlParams = new URLSearchParams(window.location.search);
    var s_key = urlParams.get('s_key');
    if( s_key === null ) {
      shepherdAlert("Script Required", "You must open a script before you can take notes!")
    } else {
      let image, blob;
      if( source.substring(0,4) !== "data" ) {
        blob = await fetch('https://cors-anywhere-dot-indieskedge-production.wl.r.appspot.com/' + source).then( r => r.blob() );
        blob.name = "Remote File";
      } else {
        blob = imageUploadReader.files[0];
      }

      // Ugly because we expect this URL to exist on the page.
      var upload = new ActiveStorage.DirectUpload(
        blob,
        direct_upload_url
      );

      upload.create(function(error, blob) {
        if( error !== null ) {
          if( error.search("Status: 403") >= 0 ) {
            shepherdAlert("Subscription Needed!", "You must have an active subscription to save images! You can sign up <button data-toggle=\"modal\" href=\"#subscriptionModal\" onclick=\"Shepherd.activeTour.complete(); $('#ideatorNotesModal').modal('hide');\" data-description=\"Sign up for image uploading and other great featuers!\" data-reset=\"$('#ideatorNotesModal').modal(\'show\');\" style=\"color: blue; margin-left: -6px; text-decoration: underline;\">here!</button>");
          } else {
            shepherdAlert("Upload Error", error);
          }
        } else if( blob.key ) {
          $.ajax({
            type: "GET",
            beforeSend: function(xhr) {
                          xhr.setRequestHeader('X-CSRF-Token',
                              $('meta[name="csrf-token"]').attr('content'));
                        },
            url: "/scripts/" + s_key + "/image_url/" + blob.key,
            responseType: 'application/json',
            dataType: 'json',
            success: function(data) {
              self._modeling.updateProperties(element, {
                source: data.url,
                key: data.key
              });
            }
          });
        } else {
          shepherdAlert("Unknown Error", "We've logged this issue.  If it continues, please reach out to support.");
          Bugsnag.notify("Unknown upload response: " + blob.toString() )
        }
      });
    }
  }

  function removeImageSelectionModal() {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
      if (canvasDefaultClick) {
        canvas.removeEventListener('click', canvasDefaultClick);
      }
    }
  }

};

ImageSelection.prototype.$inject = [
  'canvas',
  'eventBus',
  'modelng',
  'translate'
];
