// ==UserScript==
// @name         bilibili 本地评论存储插件
// @namespace    https://github.com/FakeServerBot/userscript
// @supportURL   https://github.com/FakeServerBot/userscript/issues
// @version      0.1
// @description  存储用户于视频/专栏/动态下的评论到本地。其用途是保存评论区令人感动的瞬间，以方便日后查看，研究和学习。本脚本魔改自bilibili 枝网查重 API 版，并遵循其AGPL-3.0 License。在这里对其作者表示敬意，salute😎
// @author       Sparanoid，FakeServerBot
// @license      AGPL
// @compatible   chrome 80 or later
// @match        https://*.bilibili.com/*
// @icon         https://emoji.beeimg.com/🎯/mozilla
// @require https://greasyfork.org/scripts/420061-super-gm-setvalue-and-gm-getvalue-greasyfork-mirror-js/code/Super_GM_setValue_and_GM_getValue_greasyfork_mirrorjs.js?version=890160
// @grant GM_setValue
// @grant GM_getValue
// @run-at       document-start
// ==/UserScript==
 
window.addEventListener('load', () => {
  const DEBUG = true;
  const NAMESPACE = 'bilibili-local-marker';
  var show_details_dict = {}; // Use this to decide when to hide past comments
  console.log(`${NAMESPACE} loaded`);
 
  function debug(description = '', msg = '', force = false) {
    if (DEBUG || force) {
      console.log(`${NAMESPACE}: ${description}`, msg)
    }
  }
 
  function formatDate(timestamp) {
    let date = timestamp.toString().length === 10 ? new Date(+timestamp * 1000) : new Date(+timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
 
  function rateColor(percent) {
    return `hsl(${226 + parseInt(percent/100* (360 - 226))}, 100%, 50%)`;
  }
 
  function set_value(uid, string, timestamp) {
    // first, see if you can get this value
    var uid_values = get_value(uid);
    // then, append new string to this dict...
    uid_values.push([timestamp, string]);
    // Set the new values...
    GM_SuperValue.set(uid, uid_values);
  }
 
  function is_marked(uid){
      let result = get_value(uid);
      if (result.length === 0){
          return false;
      }else{
          return true;
      }
  }
 
  function get_value(uid){
    return GM_SuperValue.get (uid, []);
  }
 
  function remove_all_values_of_target_uid(uid){
      GM_SuperValue.set(uid, []);
  }
 
  function change_to_mark_status(LocalMarkerEl, uid){
      var count = get_value(uid).length;
      if (count >= 10) {
          count = 10;
          LocalMarkerEl.innerHTML = `10+ 已标记👀`;
      } else {
          LocalMarkerEl.innerHTML = `${count} 已标记👀`;
      }
      LocalMarkerEl.style.color = rateColor(count * 10);
  }
 
  function cancel_mark_status(LocalMarkerEl){
      LocalMarkerEl.innerHTML = '标记👀';
      LocalMarkerEl.style.color = '#99A2AA';
  }
 
  function get_show_details_dict_value(id){
      if (show_details_dict.hasOwnProperty(id)){
          return show_details_dict[id];
      } else {
          show_details_dict[id] = true;
          return show_details_dict[id];
      }
  }
 
  function attachEl(item) {
    let injectWrap = item.querySelector('.con .info');
 
    // .text - comment content
    // .text-con - reply content
    let content = item.querySelector('.con .text') || item.querySelector('.reply-con .text-con');
    let id = item.dataset.id;
    // save user uid
    let uid_card = item.querySelector('.con .name') || item.querySelector('.reply-con .name');
    let uid = uid_card.getAttribute('data-usercard-mid')
    // console.log(uid);
    // Simple way to attach element on replies initially loaded with comment
    // which wouldn't trigger mutation inside observeComments
    let replies = item.querySelectorAll('.con .reply-box .reply-item');
    if (replies.length > 0) {
      [...replies].map(reply => {
        attachEl(reply);
      });
    }
 
    if (injectWrap.querySelector('.LocalMarker')) {
      debug('already loaded for this comment');
    } else {
        // Insert LocalMarker check button
        let LocalMarkerEl = document.createElement('span');
        LocalMarkerEl.style.userSelect = 'none';
        LocalMarkerEl.classList.add('LocalMarker', 'btn-hover', 'btn-highlight');
        if (is_marked(uid) === true){
            change_to_mark_status(LocalMarkerEl, uid);
        } else {
            cancel_mark_status(LocalMarkerEl);
        }
        LocalMarkerEl.addEventListener('click', e => {
          let contentPrepared = '';
          // Copy meme icons alt text
          for (let node of content.childNodes.values()) {
              if (node.nodeType === 3) {
                  contentPrepared += node.textContent;
              } else if (node.nodeName === 'IMG' && node.nodeType === 1) {
                  contentPrepared += node.alt;
              } else if (node.nodeName === 'BR' && node.nodeType === 1) {
                  contentPrepared += '\n';
              } else if (node.nodeName === 'A' && node.nodeType === 1 && node.classList.contains('comment-jump-url')) {
                  contentPrepared += node.href.replace(/https?:\/\/www\.bilibili\.com\/video\//, '');
              } else {
                  contentPrepared += node.innerText;
              }
            }
          // Need regex to stripe `回复 @username  :`
          let contentProcessed = contentPrepared.replace(/回复 @.*:/, '');
          debug('content processed', contentProcessed);
          // debug('uid', uid);
          // remove_all_values_of_target_uid(uid);
          set_value(uid, contentProcessed, Date.now());
          change_to_mark_status(LocalMarkerEl, uid);
          if (injectWrap.querySelector('.LocalMarker-result')) {
               injectWrap.querySelector('.LocalMarker-result').remove();
           }
           show_details_dict[id] = true;
      }, false);
 
      injectWrap.append(LocalMarkerEl);
 
      let show_message_button = document.createElement('span');
      show_message_button.classList.add('LocalMarker', 'btn-hover', 'btn-highlight');
      show_message_button.innerHTML = '历史评论';
      show_message_button.style.userSelect = 'none';
      show_message_button.addEventListener('click', e => {
          if (get_show_details_dict_value(id)){
                show_details_dict[id] = false;
                let message_list = get_value(uid);
                // debug('get value:', message_list);
                let resultContent = ``;
                if (message_list.length === 0){
                    resultContent = `无标记历史！`;
                }
                for (const [index, sig_meg] of message_list.entries()){
                  // debug('sig_meg', sig_meg);
                    //${formatDate(sig_meg[0])}
                  resultContent += `<p><b style="color: #222222">[${index + 1}]</b> <span style="color: #222222">${sig_meg[1]}</span> -- 标记于: <span style="color: #FB7299">${formatDate(sig_meg[0])}</span></p>`;
                  if (index < message_list.length-1){
                  resultContent += `<br></br>`;
                  }
                }
                // Insert result
                let resultWrap = document.createElement('div');
 
                resultWrap.style.position = 'relative';
                resultWrap.style.padding = '.5rem';
                resultWrap.style.margin = '.5rem 0';
                resultWrap.style.background = 'hsla(0, 0%, 50%, .1)';
                resultWrap.style.borderRadius = '4px';
                // resultWrap.style.whiteSpace = 'pre';
                resultWrap.style.wordBreak = 'break-word';
                resultWrap.style.width = '90%';
                resultWrap.classList.add('LocalMarker-result');
                resultWrap.innerHTML = resultContent;
 
                // Remove previous result if exists
                if (injectWrap.querySelector('.LocalMarker-result')) {
                  injectWrap.querySelector('.LocalMarker-result').remove();
                }
                injectWrap.append(resultWrap);
              } else {
                show_details_dict[id] = true;
                if (injectWrap.querySelector('.LocalMarker-result')) {
                    injectWrap.querySelector('.LocalMarker-result').remove();
                }
            }
      }, false);
      injectWrap.append(show_message_button);
 
      let remove_button = document.createElement('span');
 
      remove_button.classList.add('LocalMarker', 'btn-hover', 'btn-highlight');
      remove_button.innerHTML = '不再标记';
      remove_button.style.userSelect = 'none';
      remove_button.addEventListener('click', e => {
         remove_all_values_of_target_uid(uid);
         if (injectWrap.querySelector('.LocalMarker-result')) {
             injectWrap.querySelector('.LocalMarker-result').remove();
         }
         show_details_dict[id] = true;
         cancel_mark_status(LocalMarkerEl);
      }, false);
      injectWrap.append(remove_button);
    }
  }
 
  function observeComments(wrapper) {
    // .comment-list - general list for video, zhuanlan, and dongtai
    // .reply-box - replies attached to specific comment
    let commentLists = wrapper ? wrapper.querySelectorAll('.comment-list, .reply-box') : document.querySelectorAll('.comment-list, .reply-box');
 
    if (commentLists) {
 
      [...commentLists].map(commentList => {
 
        // Directly attach elements for pure static server side rendered comments
        // and replies list. Used by zhuanlan posts with reply hash in URL.
        // TODO: need a better solution
        [...commentList.querySelectorAll('.list-item, .reply-item')].map(item => {
          attachEl(item);
        });
 
        const observer = new MutationObserver((mutationsList, observer) => {
 
          for (const mutation of mutationsList) {
 
            if (mutation.type === 'childList') {
 
              // debug('observed mutations', [...mutation.addedNodes].length);
 
              [...mutation.addedNodes].map(item => {
                attachEl(item);
 
                // Check if the comment has replies
                // I check replies here to make sure I can disable subtree option for
                // MutationObserver to get better performance.
                let replies = item.querySelectorAll('.con .reply-box .reply-item');
 
                if (replies.length > 0) {
                  observeComments(item)
                  // debug(item.dataset.id + ' has rendered reply(ies)', replies.length);
                }
              })
            }
          }
        });
        observer.observe(commentList, { attributes: false, childList: true, subtree: false });
      });
    }
  }
 
  // .bb-comment loads directly for zhuanlan post. So load it directly
  observeComments();
 
  // .bb-comment loads dynamcially for dontai and videos. So observe it first
  const wrapperObserver = new MutationObserver((mutationsList, observer) => {
 
    for (const mutation of mutationsList) {
 
      if (mutation.type === 'childList') {
 
        [...mutation.addedNodes].map(item => {
          // debug('mutation wrapper added', item);
 
          if (item.classList?.contains('bb-comment')) {
            // debug('mutation wrapper added (found target)', item);
 
            observeComments(item);
 
            // Stop observing
            // TODO: when observer stops it won't work for dynamic homepage ie. https://space.bilibili.com/703007996/dynamic
            // so disable it here. This may have some performance impact on low-end machines.
            // wrapperObserver.disconnect();
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });
 
}, false);
