/*! For license information please see 3590.8965f9c78f82e26ce704.js.LICENSE.txt */
"use strict";(self.webpackChunkUV=self.webpackChunkUV||[]).push([[3590],{3590:(t,e,r)=>{r.r(e),r.d(e,{scopeCss:()=>C});var n="-shadowcsshost",s=")(?:\\(((?:\\([^)(]*\\)|[^)(]*)+?)\\))?([^,{]*)",c=new RegExp("(-shadowcsshost"+s,"gim"),o=new RegExp("(-shadowcsscontext"+s,"gim"),a=new RegExp("(-shadowcssslotted"+s,"gim"),i="-shadowcsshost-no-combinator",u=/-shadowcsshost-no-combinator([^\s]*)/,l=[/::shadow/g,/::content/g],h=/-shadowcsshost/gim,p=/:host/gim,f=/::slotted/gim,g=/:host-context/gim,d=/\/\*\s*[\s\S]*?\*\//g,m=/\/\*\s*#\s*source(Mapping)?URL=[\s\S]+?\*\//g,v=/(\s*)([^;\{\}]+?)(\s*)((?:{%BLOCK%}?\s*;?)|(?:\s*;))/g,w=/([{}])/g,_="%BLOCK%",x=function(t,e){var r=b(t),n=0;return r.escapedString.replace(v,(function(){for(var t=[],s=0;s<arguments.length;s++)t[s]=arguments[s];var c=t[2],o="",a=t[4],i="";a&&a.startsWith("{%BLOCK%")&&(o=r.blocks[n++],a=a.substring(_.length+1),i="{");var u={selector:c,content:o},l=e(u);return""+t[1]+l.selector+t[3]+i+l.content+a}))},b=function(t){for(var e=t.split(w),r=[],n=[],s=0,c=[],o=0;o<e.length;o++){var a=e[o];"}"===a&&s--,s>0?c.push(a):(c.length>0&&(n.push(c.join("")),r.push(_),c=[]),r.push(a)),"{"===a&&s++}return c.length>0&&(n.push(c.join("")),r.push(_)),{escapedString:r.join(""),blocks:n}},O=function(t,e,r){return t.replace(e,(function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];if(t[2]){for(var n=t[2].split(","),s=[],c=0;c<n.length;c++){var o=n[c].trim();if(!o)break;s.push(r(i,o,t[3]))}return s.join(",")}return i+t[3]}))},W=function(t,e,r){return t+e.replace(n,"")+r},k=function(t,e,r){return e.indexOf(n)>-1?W(t,e,r):t+e+r+", "+e+" "+t+r},j=function(t,e,r,n,s){return x(t,(function(t){var s=t.selector,c=t.content;return"@"!==t.selector[0]?s=function(t,e,r,n){return t.split(",").map((function(t){return n&&t.indexOf("."+n)>-1?t.trim():function(t,e){var r=function(t){return t=t.replace(/\[/g,"\\[").replace(/\]/g,"\\]"),new RegExp("^("+t+")([>\\s~+[.,{:][\\s\\S]*)?$","m")}(e);return!r.test(t)}(t,e)?function(t,e,r){e=e.replace(/\[is=([^\]]*)\]/g,(function(t){for(var e=[],r=1;r<arguments.length;r++)e[r-1]=arguments[r];return e[0]}));for(var n,s="."+e,c=function(t){var n=t.trim();if(!n)return"";if(t.indexOf(i)>-1)n=function(t,e,r){if(h.lastIndex=0,h.test(t)){var n="."+r;return t.replace(u,(function(t,e){return e.replace(/([^:]*)(:*)(.*)/,(function(t,e,r,s){return e+n+r+s}))})).replace(h,n+" ")}return e+" "+t}(t,e,r);else{var c=t.replace(h,"");if(c.length>0){var o=c.match(/([^:]*)(:*)(.*)/);o&&(n=o[1]+s+o[2]+o[3])}}return n},o=function(t){var e=[],r=0;return{content:(t=t.replace(/(\[[^\]]*\])/g,(function(t,n){var s="__ph-"+r+"__";return e.push(n),r++,s}))).replace(/(:nth-[-\w]+)(\([^)]+\))/g,(function(t,n,s){var c="__ph-"+r+"__";return e.push(s),r++,n+c})),placeholders:e}}(t),a="",l=0,p=/( |>|\+|~(?!=))\s*/g,f=!((t=o.content).indexOf(i)>-1);null!==(n=p.exec(t));){var g=n[1],d=t.slice(l,n.index).trim();a+=((f=f||d.indexOf(i)>-1)?c(d):d)+" "+g+" ",l=p.lastIndex}var m,v=t.substring(l);return a+=(f=f||v.indexOf(i)>-1)?c(v):v,m=o.placeholders,a.replace(/__ph-(\d+)__/g,(function(t,e){return m[+e]}))}(t,e,r).trim():t.trim()})).join(", ")}(t.selector,e,r,n):(t.selector.startsWith("@media")||t.selector.startsWith("@supports")||t.selector.startsWith("@page")||t.selector.startsWith("@document"))&&(c=j(t.content,e,r,n)),{selector:s.replace(/\s{2,}/g," ").trim(),content:c}}))},C=function(t,e,r){var s=e+"-h",u=e+"-s",h=t.match(m)||[];t=t.replace(d,"");var v=[];if(r){var w=function(t){var e="/*!@___"+v.length+"___*/",r="/*!@"+t.selector+"*/";return v.push({placeholder:e,comment:r}),t.selector=e+t.selector,t};t=x(t,(function(t){return"@"!==t.selector[0]?w(t):t.selector.startsWith("@media")||t.selector.startsWith("@supports")||t.selector.startsWith("@page")||t.selector.startsWith("@document")?(t.content=x(t.content,w),t):t}))}var _=function(t,e,r,s,u){return t=function(t,e){var r=a;return t.replace(r,(function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];if(t[2]){var n=t[2].trim(),s=t[3];return"."+e+" > "+n+s}return i+t[3]}))}(t=function(t){return O(t,o,k)}(t=function(t){return O(t,c,W)}(t=t.replace(g,"-shadowcsscontext").replace(p,n).replace(f,"-shadowcssslotted"))),s),t=function(t){return l.reduce((function(t,e){return t.replace(e," ")}),t)}(t),e&&(t=j(t,e,r,s)),(t=(t=t.replace(/-shadowcsshost-no-combinator/g,"."+r)).replace(/>\s*\*\s+([^{, ]+)/gm," $1 ")).trim()}(t,e,s,u);return t=[_].concat(h).join("\n"),r&&v.forEach((function(e){var r=e.placeholder,n=e.comment;t=t.replace(r,n)})),t}}}]);