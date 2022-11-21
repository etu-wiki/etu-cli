"use strict";(self.webpackChunkUV=self.webpackChunkUV||[]).push([[8179],{8179:(e,n,t)=>{t.r(n),t.d(n,{ion_select_popover:()=>o});var i=t(2085),r=t(1399),o=function(){function e(e){(0,i.r)(this,e),this.options=[]}return e.prototype.onSelect=function(e){var n=this.options.find((function(n){return n.value===e.target.value}));n&&(0,r.s)(n.handler)},e.prototype.render=function(){return(0,i.h)(i.H,{class:(0,i.f)(this)},(0,i.h)("ion-list",null,void 0!==this.header&&(0,i.h)("ion-list-header",null,this.header),(void 0!==this.subHeader||void 0!==this.message)&&(0,i.h)("ion-item",null,(0,i.h)("ion-label",{class:"ion-text-wrap"},void 0!==this.subHeader&&(0,i.h)("h3",null,this.subHeader),void 0!==this.message&&(0,i.h)("p",null,this.message))),(0,i.h)("ion-radio-group",null,this.options.map((function(e){return(0,i.h)("ion-item",null,(0,i.h)("ion-label",null,e.text),(0,i.h)("ion-radio",{checked:e.checked,value:e.value,disabled:e.disabled}))})))))},Object.defineProperty(e,"style",{get:function(){return".sc-ion-select-popover-h ion-list.sc-ion-select-popover{margin-left:0;margin-right:0;margin-top:-1px;margin-bottom:-1px}.sc-ion-select-popover-h ion-label.sc-ion-select-popover, .sc-ion-select-popover-h ion-list-header.sc-ion-select-popover{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0}"},enumerable:!0,configurable:!0}),e}()},1399:(e,n,t)=>{t.d(n,{B:()=>S,a:()=>l,b:()=>c,c:()=>p,d:()=>y,e:()=>g,f:()=>x,g:()=>h,h:()=>m,i:()=>A,j:()=>b,k:()=>d,p:()=>f,s:()=>P});var i=t(2085),r=function(e,n,t,i){return new(t||(t=Promise))((function(r,o){function a(e){try{u(i.next(e))}catch(e){o(e)}}function s(e){try{u(i.throw(e))}catch(e){o(e)}}function u(e){e.done?r(e.value):new t((function(n){n(e.value)})).then(a,s)}u((i=i.apply(e,n||[])).next())}))},o=function(e,n){var t,i,r,o,a={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function s(o){return function(s){return function(o){if(t)throw new TypeError("Generator is already executing.");for(;a;)try{if(t=1,i&&(r=2&o[0]?i.return:o[0]?i.throw||((r=i.return)&&r.call(i),0):i.next)&&!(r=r.call(i,o[1])).done)return r;switch(i=0,r&&(o=[2&o[0],r.value]),o[0]){case 0:case 1:r=o;break;case 4:return a.label++,{value:o[1],done:!1};case 5:a.label++,i=o[1],o=[0];continue;case 7:o=a.ops.pop(),a.trys.pop();continue;default:if(!((r=(r=a.trys).length>0&&r[r.length-1])||6!==o[0]&&2!==o[0])){a=0;continue}if(3===o[0]&&(!r||o[1]>r[0]&&o[1]<r[3])){a.label=o[1];break}if(6===o[0]&&a.label<r[1]){a.label=r[1],r=o;break}if(r&&a.label<r[2]){a.label=r[2],a.ops.push(o);break}r[2]&&a.ops.pop(),a.trys.pop();continue}o=n.call(e,a)}catch(e){o=[6,e],i=0}finally{t=r=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,s])}}},a=void 0,s=0,u=function(e){return{create:function(n){return h(e,n)},dismiss:function(n,t,i){return m(document,n,t,e,i)},getTop:function(){return r(this,void 0,void 0,(function(){return o(this,(function(n){return[2,b(document,e)]}))}))}}},c=u("ion-alert"),l=u("ion-action-sheet"),d=u("ion-picker"),f=u("ion-popover"),p=function(e){var n=document;v(n);var t=s++;e.overlayIndex=t,e.hasAttribute("id")||(e.id="ion-overlay-"+t)},h=function(e,n){return customElements.whenDefined(e).then((function(){var t=document,i=t.createElement(e);return i.classList.add("overlay-hidden"),Object.assign(i,n),w(t).appendChild(i),i.componentOnReady()}))},v=function(e){0===s&&(s=1,e.addEventListener("focusin",(function(n){var t=b(e);if(t&&t.backdropDismiss&&!D(t,n.target)){var i=t.querySelector("input,button");i&&i.focus()}})),e.addEventListener("ionBackButton",(function(n){var t=b(e);t&&t.backdropDismiss&&n.detail.register(100,(function(){return t.dismiss(void 0,S)}))})),e.addEventListener("keyup",(function(n){if("Escape"===n.key){var t=b(e);t&&t.backdropDismiss&&t.dismiss(void 0,S)}})))},m=function(e,n,t,i,r){var o=b(e,i,r);return o?o.dismiss(n,t):Promise.reject("overlay does not exist")},b=function(e,n,t){var i=function(e,n){return void 0===n&&(n="ion-alert,ion-action-sheet,ion-loading,ion-modal,ion-picker,ion-popover,ion-toast"),Array.from(e.querySelectorAll(n)).filter((function(e){return e.overlayIndex>0}))}(e,n);return void 0===t?i[i.length-1]:i.find((function(e){return e.id===t}))},y=function(e,n,t,s,u){return r(a,void 0,void 0,(function(){var r;return o(this,(function(o){switch(o.label){case 0:return e.presented?[2]:(e.presented=!0,e.willPresent.emit(),r=e.enterAnimation?e.enterAnimation:i.i.get(n,"ios"===e.mode?t:s),[4,k(e,r,e.el,u)]);case 1:return o.sent()&&e.didPresent.emit(),[2]}}))}))},g=function(e,n,t,s,u,c,l){return r(a,void 0,void 0,(function(){var r,a;return o(this,(function(o){switch(o.label){case 0:if(!e.presented)return[2,!1];e.presented=!1,o.label=1;case 1:return o.trys.push([1,3,,4]),e.willDismiss.emit({data:n,role:t}),r=e.leaveAnimation?e.leaveAnimation:i.i.get(s,"ios"===e.mode?u:c),[4,k(e,r,e.el,l)];case 2:return o.sent(),e.didDismiss.emit({data:n,role:t}),[3,4];case 3:return a=o.sent(),console.error(a),[3,4];case 4:return e.el.remove(),[2,!0]}}))}))},w=function(e){return e.querySelector("ion-app")||e.body},k=function(e,n,s,u){return r(a,void 0,void 0,(function(){var r,a,c,l,d;return o(this,(function(o){switch(o.label){case 0:if(e.animation)return e.animation.destroy(),e.animation=void 0,[2,!1];s.classList.remove("overlay-hidden"),r=s.shadowRoot||e.el,c=!0,o.label=1;case 1:return o.trys.push([1,4,,5]),[4,t.e(7879).then(t.bind(t,7879))];case 2:return[4,o.sent().create(n,r,u)];case 3:return a=o.sent(),[3,5];case 4:return o.sent(),(a=n(r,u)).fill("both"),c=!1,[3,5];case 5:return e.animation=a,e.animated&&i.i.getBoolean("animated",!0)||a.duration(0),e.keyboardClose&&a.beforeAddWrite((function(){var e=s.ownerDocument.activeElement;e&&e.matches("input, ion-input, ion-textarea")&&e.blur()})),[4,a.playAsync()];case 6:return l=o.sent(),d=void 0===l||a.hasCompleted,c&&a.destroy(),e.animation=void 0,[2,d]}}))}))},x=function(e,n){var t,i=new Promise((function(e){return t=e}));return E(e,n,(function(e){t(e.detail)})),i},E=function(e,n,t){var i=function(r){e.removeEventListener(n,i),t(r)};e.addEventListener(n,i)},A=function(e){return"cancel"===e||e===S},D=function(e,n){for(;n;){if(n===e)return!0;n=n.parentElement}return!1},L=function(e){return e()},P=function(e,n){if("function"==typeof e)return i.i.get("_zoneGate",L)((function(){try{return e(n)}catch(e){console.error(e)}}))},S="backdrop"}}]);