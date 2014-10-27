/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  // type + id
  var name;
  // dialogs
  var pwd, sandbox;
  var l10n;

  var extensionColors = [];
  extensionColors.txt  = "#427bba"; // Text
  extensionColors.doc  = "#427bba";
  extensionColors.docx = "#427bba";
  extensionColors.rtf  = "#427bba";
  extensionColors.pdf  = "#ad1e24";
  extensionColors.html = "#ad1e24";
  extensionColors.htm  = "#ad1e24";
  extensionColors.mov  = "#bc4fa9"; // Video
  extensionColors.avi  = "#bc4fa9";
  extensionColors.wmv  = "#bc4fa9";
  extensionColors.mpeg = "#bc4fa9";
  extensionColors.flv  = "#bc4fa9";
  extensionColors.divx = "#bc4fa9";
  extensionColors.xvid = "#bc4fa9";
  extensionColors.mp3  = "#563b8c"; // Music
  extensionColors.wav  = "#563b8c";
  extensionColors.zip  = "#e7ab30"; // Sonstige
  extensionColors.rar  = "#e7ab30";
  extensionColors.xml  = "#d6732c";
  extensionColors.ppt  = "#d6732c";
  extensionColors.pptx = "#d6732c";
  extensionColors.xls  = "#6ea64e";
  extensionColors.xlsx = "#6ea64e";
  extensionColors.exe  = "#4b4a4a";
  extensionColors.unknown = "#8a8a8a"; // Unbekannt

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'dDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-popup-init', sender: name});
    addSandbox();
    addErrorView();
    $(window).on('unload', onClose);
    $('#closeBtn').click(onClose);
    $('#copyBtn').click(onCopy);
    $('body').addClass('spinner');
    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([
      'alert_header_error'
    ], function(result) {
      l10n = result;
    });
  }

  function onClose() {
    $(window).off('unload');
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    return false;
  }

  function onCopy() {
    // copy to clipboard
    var doc = sandbox.contents().get(0);
    var sel = doc.defaultView.getSelection();
    sel.selectAllChildren(sandbox.contents().find('#content').get(0));
    doc.execCommand('copy');
    sel.removeAllRanges();
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin',
      css: {
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        bottom: 0
      },
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: '60px',
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    var attachments = $('<div/>', {
      id: 'attachments',
      css: {
        position: 'absolute',
        top: '250px',
        left: 0,
        right: 0,
        bottom: '0',
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', '../../dep/wysihtml5/css/wysihtml5.css');
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(style)
                                     .append(style2);
      sandbox.contents().find('body').append(content);
      sandbox.contents().find('body').append(attachments);
    });
    $('.modal-body').append(sandbox);
  }

  function addPwdDialog() {
    pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: 'pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').append(pwd);
  }

  function showMessageArea() {
    if (pwd) {
      pwd.fadeOut(function() {
        $('#decryptmail').fadeIn();
      });
    } else {
      $('#decryptmail').fadeIn();
    }
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well'}).appendTo(errorbox);
    $('.modal-body').append(errorbox);
  }

  function showError(msg) {
    showMessageArea();
    // hide sandbox
    $('.modal-body iframe').hide();
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger');
    $('#copyBtn').prop('disabled', true);
  }

  function addAttachment(filename, content, mimeType) {
    var fileNameNoExt = extractFileNameWithoutExt(filename);
    var fileExt = extractFileExtension(filename);
    var extColor = getExtensionColor(fileExt);

    var extensionButton = $('<span/>', {
      "style": "text-transform: uppercase; background-color: "+extColor,
      "class": 'label'
    }).append(fileExt);

    //var blob = new Blob(content, { type: mimeType });
    //var dataURL = window.URL.createObjectURL(content);

    var fileUI = $('<a/>', {
      "href": content,
      "class": 'label label-default',
      "download": filename,
      "style": 'background-color: #ddd'
    })
      .append(extensionButton)
      .append(" "+fileNameNoExt+" ");

    $attachments = sandbox.contents().find('#attachments');
    $attachments.append(fileUI);
    $attachments.append("&nbsp;");
  }

  function messageListener(msg) {
    // remove spinner for all events
    $('body').removeClass('spinner');
    switch (msg.event) {
      case 'decrypted-message':
        //console.log('popup decrypted message: ', msg.message);
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        sandbox.contents().find('#content').append(message);
        break;
      case 'add-decrypted-attachment':
        console.log('popup adding decrypted attachment: ', msg.message);
        showMessageArea();
        addAttachment(msg.message.filename, msg.message.content, msg.message.mimeType);
        break;
      case 'show-pwd-dialog':
        addPwdDialog();
        break;
      case 'error-message':
        showError(msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }

  function extractFileNameWithoutExt(fileName) {
    var indexOfDot = fileName.lastIndexOf(".");
    if(indexOfDot > 0 ) { // case: regular
      return fileName.substring(0, indexOfDot);
    } else if(indexOfDot === 0) { // case ".txt"
      return "";
    } else {
      return fileName;
    }
  }

  function extractFileExtension(fileName) {
    var lastindexDot = fileName.lastIndexOf(".");
    if (lastindexDot < 0) { // no extension
      return "";
    } else {
      return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
    }
  }

  function getExtensionColor(fileExt) {
    var color = extensionColors[fileExt];
    if (color === undefined) {
      color = extensionColors.unknown;
    }
    return color;
  }

  $(document).ready(init);

}());
