/*!
 * wheel.js
 * @author ydr.me
 * @create 2014-10-07 14:45
 */


define(function (require, exports, module) {
    /**
     * 扩展滚轮事件
     * @module core/event/wheel
     * @requires core/event/base
     *
     * @example
     * event.on(ele, 'wheelstart', function(eve){});
     * event.on(ele, 'wheelchange', function(eve){
     *     // 滚轮的距离在 eve.alienDetail 里
     *     // eve.alienDetail.deltaY < 0 ? 向下滚轮 ：向上滚轮
     * });
     * event.on(ele, 'wheelend', function(eve){});
     */
    'use strict';

    var event = require('./base.js');
    var mousewheel = 'wheel mousewheel DOMMouseScroll MozMousePixelScroll';
    var timeout = 500;
    var timeid = 0;
    var isStart = !1;
    var startEvent = event.create('wheelstart');
    var changeEvent = event.create('wheelchange');
    var endEvent = event.create('wheelend');

    event.on(document, mousewheel, function (eve) {
        var ele = eve.target;
        var deltaY = 0;
        var dispatchDragend;

        if (timeid) {
            clearTimeout(timeid);
            timeid = 0;
        }

        timeid = setTimeout(function () {
            event.dispatch(ele, endEvent);
            isStart = !1;
        }, timeout);

        if (!isStart) {
            isStart = !0;

            event.extend(startEvent, eve);
            event.dispatch(ele, startEvent);
        }

        // chrome
        if ('wheelDeltaY' in eve) {
            deltaY = eve.wheelDeltaY > 0 ? 1 : -1;
        }
        // ie9/firefox
        else if ('deltaY' in eve) {
            deltaY = eve.deltaY > 0 ? -1 : 1;
        }
        // ie8/ie7/ie6
        else if ('wheelDelta' in eve) {
            deltaY = eve.wheelDelta > 0 ? 1 : -1;
        }

        event.extend(changeEvent, eve, {
            deltaX: 0,
            deltaY: deltaY,
            deltaZ: 0
        });
        dispatchDragend = event.dispatch(ele, changeEvent);

        if (dispatchDragend.defaultPrevented === true) {
            eve.preventDefault();
        }
    });

    module.exports = event;
});