import {
  domify,
  event as domEvent
} from 'min-dom';

import {
  assign
} from 'min-dash';

import {
  fileReader
} from './FileUtil.js';

/* constants */
const POSTIT_IMAGE = 'postit:Image';
function randStr(length=5) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const ENTRY_PROTOTYPE = () => {
  return {
    objId: randStr(),
    objType: POSTIT_IMAGE,
    objTitle: '',
    objDescription: '',
    objStarred: false,
    objHidden: false,
    objUnkeyed: false,
    objUnkeyedOriginal: false,
    objSrcUnkeyed: '',
    objCreationDate: '',
    source: '',
    objPositionX: null,
    objPositionY: null,
  };
};

/* constants */


var text;
export default function DragDropImages(eventBus, canvas, modeling, elementFactory, create, translate) {

  this._eventBus = eventBus;
  this._canvas = canvas;
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._create = create;
  this._translate = translate;

  const createImageElement = _createImageElement.bind(this);

  text = { 'URL': this._translate('URL'),
    'An error occured during the file upload': this._translate('An error occured during the file upload'),
    'Upload files here': this._translate('Upload files here'),
    'Upload from local is for demo purposes only. It slows down the page and increases the file size.': this._translate('Upload from local is for demo purposes only. It slows down the page and increases the file size.'),
    'uploaded': this._translate('uploaded'),
    'file': this._translate('file'),
    'files': this._translate('files'),
    'selected': this._translate('selected'),
    'Upload again': this._translate('Upload again'),
    'Drag here': this._translate('Drag here'),
  };

  DragDropImages.CSS = `
    .pjs-visible {
      visibility: visible !important;
      display: block !important;
    }
    
    #pjs-drop-zone {
      visibility: hidden;
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: #555555;
      z-index: 1;
      opacity: 0.9;
    }

    #pjs-drop-zone-border {
      border-radius: 10px 10px 10px 10px;
      -moz-border-radius: 10px 10px 10px 10px;
      -webkit-border-radius: 10px 10px 10px 10px;
      border: 5px dashed #000000;
      z-index: 2;
      display: table;
      width: 98.9%;
      height: 100%; 
    }

    .pjs-drop-zone-text {
      vertical-align: middle;
      width: 100%;
      font-size: 25px;
      font-weight: bold;
      margin: 0 auto;
      text-align: center;
      display: table-cell;
  }`;

  DragDropImages.HTML_MARKUP = '<div id="pjs-drop-zone">'+
        '<div id="pjs-drop-zone-border">'+
          '<div class="pjs-drop-zone-text">'+
          text['Drag here']+
        '</div>'+
      '</div>'+
  '</div>';

  var style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = DragDropImages.CSS;
  document.getElementsByTagName('HEAD')[0].appendChild(style);

  const canvasDOM = document.getElementById('noteCanvas');

  const container = this._container = domify(DragDropImages.HTML_MARKUP);
  canvasDOM.insertBefore(container, canvas.firstChild);

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  domEvent.bind(canvasDOM, 'drag', function(ev) {
  }, false);
  domEvent.bind(canvasDOM, 'dragstart', function(ev) {
  }, false);
  domEvent.bind(canvasDOM, 'dragend', function(ev) {
  }, false);
  domEvent.bind(canvasDOM, 'dragover', function(ev) {
    preventDefaults(ev);
  }, false);
  domEvent.bind(canvasDOM, 'dragenter', function(ev) {
    document.getElementById('pjs-drop-zone').classList.add('pjs-visible');
  }, false);
  domEvent.bind(canvasDOM,'dragleave', function(ev) {
    document.getElementById('pjs-drop-zone').classList.remove('pjs-visible');
  }, false);
  domEvent.bind(canvasDOM, 'drop', async function(ev) {
    preventDefaults(ev);
    document.getElementById('pjs-drop-zone').classList.remove('pjs-visible');
    uploadFiles(ev);
  }, false);


  async function uploadFiles(ev) {
    let uploadDisplayText;
    let uploadResultObj = await fileReader(ev, null);
    let uploadImageResult = uploadResultObj.image_results;
    let uploadFileResult = uploadResultObj.file_results;
    let errors = uploadResultObj.errors;
    if (!errors) {
      let uploadedFilesCount = (uploadFileResult.length) ? uploadFileResult.length : null;
      uploadDisplayText = uploadedFilesCount;
      if (isNaN(uploadedFilesCount) === false) {
        const filePluralText =+ (uploadFileResult.length == 1) ? text['file'] : text['files'];
        uploadDisplayText += ' ' + filePluralText + ' ' + text['uploaded'];
      }

      let i = uploadFileResult.length;
      while (i--) {
        createImageElement(ev, convertToEntry({ source: uploadImageResult[i], file_source: uploadFileResult[i] }));
      }
      console.log(uploadDisplayText);
    }
  }
}

const convertToEntry = function(options) {
  return { ...ENTRY_PROTOTYPE(), ...options };
};

const _createImageElement = async function(event, options) {
  options = options || [];
  const shape = this._elementFactory.createShape({
    type: POSTIT_IMAGE,
    ...options,
  });
  const attach = false;
  const hints = { createElementsBehavior: false };
  const position = { x: event.x + (Math.random() * 100), y: event.y + (Math.random() * 100) };
  const target = this._canvas.getRootElement();
  var elements = this._modeling.createElements([shape], position, target, assign({}, hints, {
    attach: attach,
  }));

  var urlParams = new URLSearchParams(window.location.search);
  var s_key = urlParams.get('s_key');
  if( s_key === null ) {
    shepherdAlert("Script Required", "You must open a script before you can take notes!")
  } else {
    let blob =  options.file_source;

    // Ugly because we expect this URL to exist on the page.
    var upload = new ActiveStorage.DirectUpload(
      blob,
      direct_upload_url
    );

    await upload.create(function(elements, error, blob) {
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
          success: function(elements, data) {
            for( let element in elements ) {
              this._modeling.updateProperties(elements[element], {
                source: data.url,
                key: data.key
              });
            }
          }.bind(this, elements)
        });
      } else {
        shepherdAlert("Unknown Error", "We've logged this issue.  If it continues, please reach out to support.");
        Bugsnag.notify("Unknown upload response: " + blob.toString() )
      }
    }.bind(this, elements));
  }

  return { id: shape.id, x: position.x, y: position.y, shape, width: shape.width, height: shape.height };
};

DragDropImages.prototype.$inject = [
  'eventBus',
  'canvas',
  'modeling',
  'elementFactory',
  'create',
  'translate'
];
