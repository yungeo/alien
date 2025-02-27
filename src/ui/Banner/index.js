/**
 * Banner.js
 * @author ydr.me
 * @create 2014-10-10 22:36
 *
 */

define(function (require, exports, module) {
    /**
     * @module ui/Banner/index
     * @requires core/event/touch
     * @requires core/dom/modification
     * @requires core/dom/selector
     * @requires core/dom/animation
     * @requires util/class
     * @requires util/dato
     * @requires util/typeis
     * @requires libs/Template
     * @requires ui/generator
     */
    'use strict';

    var noop = function () {
        // ignore
    };
    var alienIndex = 0;
    var style = require('css!./style.css');
    var template = require('html!./template.html');
    var event = require('../../core/event/touch.js');
    var modification = require('../../core/dom/modification.js');
    var selector = require('../../core/dom/selector.js');
    var attribute = require('../../core/dom/attribute.js');
    var animation = require('../../core/dom/animation.js');
    var generator = require('../generator.js');
    var dato = require('../../util/dato.js');
    var typeis = require('../../util/typeis.js');
    var Template = require('../../libs/Template.js');
    var tpl = new Template(template);
    var alienClass = 'alien-ui-banner';
    var defaults = {
        width: 700,
        height: 300,
        item: 'li',
        duration: 678,
        timeout: 3456,
        easing: 'ease-in-out-back',
        autoPlay: true,
        // 运动方向
        // -x x 轴向左
        // +x x 轴向右
        // -y y 轴向下
        // +y y 轴向上
        axis: '+x',
        // 触摸超过边界多少比例的时候切换
        boundaryRatio: 0.3,
        // 导航生成器
        navGenerator: null
    };

    var Banner = generator({
        STATIC: {
            /**
             * 默认配置
             * @name defaults
             * @property {Number} [width=700] banner 宽度，默认700
             * @property {Number} [height=300] banner 高度，默认300
             * @property {String} [item="li"] banner 项目选择器，默认"li"
             * @property {Number} [duration=456] banner 播放动画时间，默认456，单位毫秒
             * @property {String} [easing="ease-in-out-back"] banner 播放动画缓冲效果，默认"ease-in-out-back"
             * @property {Boolean} [autoPlay=true] banner 是否自动播放
             * @property {String} [axis="+x"] banner 正序方向
             * @property {null|Function} [navGenerator=null] 使用一个函数生成导航，参数1为导航索引值
             */
            defaults: defaults
        },


        constructor: function (ele, options) {
            var the = this;

            ele = selector.query(ele);

            if (!ele.length) {
                throw new Error('instance element is empty');
            }

            the._$ele = ele[0];
            the._options = dato.extend(true, {}, defaults, options);
            the._init();
        },


        /**
         * 初始化
         * @public
         * @returns {Banner}
         * @private
         */
        _init: function () {
            var the = this;

            the._initData();
            the._initNode();
            the._initEvent();

            return the;
        },


        /**
         * 初始化数据
         * @private
         */
        _initData: function () {
            var the = this;
            var options = the._options;

            the._id = ++alienIndex;
            the._showIndex = 0;
            the._translate = 0;
            the._direction = options.axis.indexOf('x') > -1 ? 'X' : 'Y';
            the._increase = options.axis.indexOf('-') > -1 ? -1 : 1;
            the._distance = 0;
            the._isPrivatePlay = false;
            the._playTimeID = 0;
        },


        /**
         * 初始化节点
         * @private
         */
        _initNode: function () {
            var the = this;
            var options = the._options;
            var $cloneStart0;
            var $cloneStart1;
            var $cloneEnd0;
            var $cloneEnd1;
            var bannerData = {
                id: the._id,
                nav: []
            };
            var navFilter = typeis(options.nav) === 'function' ? options.nav : function () {
                return '';
            };
            var $bannerWrap;

            dato.each(the._$items, function (index) {
                bannerData.nav.push(navFilter(index));
            });

            the._$items = selector.query(options.item, the._$ele);
            $bannerWrap = modification.parse(tpl.render(bannerData))[0];
            modification.insert($bannerWrap, the._$ele, 'afterend');
            modification.insert(the._$ele, $bannerWrap, 'afterbegin');

            if (the._$items.length > 1) {
                // clone
                $cloneStart0 = the._$items[0].cloneNode(true);
                $cloneStart1 = the._$items[0].cloneNode(true);
                $cloneEnd0 = the._$items[the._$items.length - 1].cloneNode(true);
                $cloneEnd1 = the._$items[the._$items.length - 1].cloneNode(true);

                // addClass
                attribute.addClass($cloneStart0, alienClass + '-clone');
                attribute.addClass($cloneStart1, alienClass + '-clone');
                attribute.addClass($cloneEnd0, alienClass + '-clone');
                attribute.addClass($cloneEnd1, alienClass + '-clone');

                // insert
                modification.insert($cloneEnd0, the._$ele, 'afterbegin');
                modification.insert($cloneStart1, the._$ele, 'afterbegin');
                modification.insert($cloneStart0, the._$ele, 'beforeend');
                modification.insert($cloneEnd1, the._$ele, 'beforeend');
                the._$items.unshift($cloneEnd0);
                the._$items.unshift($cloneStart1);
                the._$items.push($cloneStart0);
                the._$items.push($cloneEnd1);
            }

            the._$banner = $bannerWrap;
            the._$nav = selector.query('.' + alienClass + '-nav', $bannerWrap)[0];

            if (the._$nav) {
                the._$navItems = selector.children(the._$nav);
            } else {
                the._$navItems = [];
            }

            the._$clones = [$cloneStart0, $cloneStart1, $cloneEnd0, $cloneEnd1];
        },


        /**
         * 切换克隆元素显隐
         * @param isDisplay
         * @private
         */
        _toggleClone: function (isDisplay) {
            attribute[(isDisplay ? 'remove' : 'add') + 'Class'](this._$banner, alienClass + '-touch');
        },


        /**
         * 初始化事件监听
         * @private
         */
        _initEvent: function () {
            var the = this;
            var options = the._options;
            var translate;
            var touch0;
            var touch1;
            // 触摸结束
            var _touchdone = function _touchdone() {
                the._toggleClone(true);
            };

            // 单击导航
            if (the._$navItems.length) {
                event.on(the._$banner, 'click tap', '.' + alienClass + '-nav-item', function () {
                    var index = attribute.data(this, 'index');
                    var type = index > the._showIndex ? 'next' : 'prev';

                    if (the._showIndex === the._$items.length - 3 && index === 0) {
                        type = 'next';
                    } else if (the._showIndex === 0 && index === the._$items.length - 3) {
                        type = 'prev';
                    }

                    the._clear();
                    the.index(type, index);
                });
            }

            // 鼠标悬停
            event.on(the._$banner, 'mouseenter', function () {
                the._isPrivatePlay = false;
                the._clear();
            });

            event.on(the._$banner, 'mouseleave', function () {
                if (options.autoPlay) {
                    the._isPrivatePlay = true;
                    the.play();
                }
            });

            // 触摸
            event.on(the._$banner, 'touch1start', function (eve) {
                the.pause();
                the._toggleClone(false);
                translate = the._translate;
                touch0 = eve['page' + the._direction];
                eve.preventDefault();
            });

            event.on(the._$banner, 'touch1move', function (eve) {
                touch1 = eve['page' + the._direction];
                attribute.css(the._$ele, the._calTranslate(translate + touch1 - touch0, false));
                eve.preventDefault();
            });

            event.on(the._$banner, 'touch1end', function () {
                var index = the._getIndex(touch1 - touch0, translate + touch1 - touch0);
                var type = touch1 <= touch0 && the._increase > 0 ||
                touch1 >= touch0 && the._increase < 0 ? 'next' : 'prev';

                if (index === the._showIndex) {
                    animation.animate(the._$ele, the._calTranslate(the._translate), {
                        duration: options.duration,
                        easing: options.easing
                    }, _touchdone);
                } else {
                    the.index(type, index, _touchdone);
                }
            });

            the.resize(options);

            if (options.autoPlay) {
                the._isPrivatePlay = true;
                the.play();
            }
        },


        /**
         * 根据当前宽度计算索引值
         * @returns order
         * @returns distance
         * @returns {number}
         * @private
         */
        _getIndex: function (order, distance) {
            var the = this;
            var options = the._options;
            var ratio;

            distance = Math.abs(distance);
            distance -= the._distance * 2;

            // 左尽头
            if (distance <= 0) {
                return 0;
            }
            // 右尽头
            else if (distance >= the._distance * (the._$items.length - 5)) {
                return the._$items.length - 5;
            }
            // 中间
            else {
                ratio = distance % the._distance / the._distance;

                if (order > 0) {
                    ratio = 1 - ratio;
                }

                return Math[order > 0 ? 'ceil' : 'floor'](distance / the._distance) +
                    (ratio > options.boundaryRatio ? (order > 0 ? -1 : 1) : 0);
            }
        },


        /**
         * 计算偏移量
         * @param val
         * @param [isOverWrite=true]
         * @private
         */
        _calTranslate: function (val, isOverWrite) {
            var the = this;
            var set = {};

            if (isOverWrite !== false) {
                the._translate = val;
            }

            set['translate' + the._direction] = val + 'px';

            return set;
        },


        /**
         * 重置尺寸
         * @param {Object} size  尺寸对象
         * @param {Number} [size.width]  宽度
         * @param {Number} [size.height]  高度
         * @returns {Banner}
         */
        resize: function (size) {
            var the = this;
            var options = the._options;
            var set;
            var width;
            var height;

            options.width = size.width || options.width;
            options.height = size.height || options.height;
            width = options.width * (the._direction === 'X' ? the._$items.length : 1);
            height = options.height * (the._direction === 'Y' ? the._$items.length : 1);
            the._distance = the._direction === 'X' ? options.width : options.height;
            set = the._calTranslate(the._$items.length > 5 ? -(the._showIndex + 2) * the._distance : 0);

            dato.extend(true, set, {
                position: 'relative',
                width: width,
                height: height
            });

            dato.each(the._$items, function (index, item) {
                attribute.css(item, {
                    position: 'relative',
                    width: options.width,
                    height: options.height,
                    float: 'left',
                    overflow: 'hidden'
                });
            });
            attribute.css(the._$ele, set);
            attribute.css(the._$banner, {
                position: 'relative',
                width: options.width,
                height: options.height,
                overflow: 'hidden'
            });

            return the;
        },


        /**
         * 运动前的索引值计算
         * @param move -1：反序，1：正序
         * @param index
         * @returns {*}
         * @private
         */
        _beforeShowIndex: function (move, showIndex) {
            var the = this;
            var length = the._$items.length;

            // ++
            if (the._increase > 0 && move === 1 ||
                the._increase < 0 && move === -1) {
                showIndex = showIndex === length - 5 ? 0 : showIndex + 1;
            }
            // --
            else {
                showIndex = showIndex === 0 ? length - 5 : showIndex - 1;
            }

            return showIndex;
        },


        /**
         * 显示之前的定位与计算下一帧的位置
         * @param type
         * @param showIndex
         * @returns {*}
         * @private
         */
        _beforeDisplayIndex: function (type, showIndex) {
            var the = this;
            var length = the._$items.length;
            var count = length - 4;
            var _showIndex = the._showIndex;
            var $ele = the._$ele;
            var distance = the._distance;
            var isPlusPlus = the._increase < 0 && type === 'prev' ||
                the._increase > 0 && type === 'next';
            var isMinusMinus = the._increase < 0 && type === 'next' ||
                the._increase > 0 && type === 'prev';

            if (isPlusPlus && _showIndex === count - 1) {
                attribute.css($ele, the._calTranslate(-1 * distance));
            } else if (isMinusMinus && _showIndex === 0) {
                attribute.css($ele, the._calTranslate(-(count + 2) * distance));
            }
        },


        /**
         * 播放第几个项目
         * @param {String} [type] 展示方式，默认下一张
         * @param {Number} index 需要展示的序号
         * @param {Function} [callback] 回调
         */
        index: function (type, index, callback) {
            var args = arguments;
            var argL = args.length;
            var the = this;
            var options = the._options;
            var count = the._$items.length - 2;
            var set;

            if (count < 2 || index === the._showIndex) {
                return the;
            }

            if (typeis(args[0]) === 'number') {
                type = 'next';
                index = args[0];
            }

            callback = args[argL - 1];

            if (typeis(callback) !== 'function') {
                callback = noop;
            }

            the._beforeDisplayIndex(type, index);

            if (index >= count) {
                throw new Error('can not go to ' + type + ' ' + index);
            }

            set = the._calTranslate(-the._distance * (index + 2));
            the.emit('beforechange', the._showIndex, index);

            animation.animate(the._$ele, set, {
                duration: options.duration,
                easing: options.easing
            }, function () {
                var siblings;

                the.emit('change', index, the._showIndex);
                the._showIndex = index;

                if (the._$navItems) {
                    attribute.addClass(the._$navItems[index], alienClass + '-nav-item-active');
                    siblings = selector.siblings(the._$navItems[index]);

                    dato.each(siblings, function (i, sibling) {
                        attribute.removeClass(sibling, alienClass + '-nav-item-active');
                    });
                }

                callback.call(the);
            });
        },


        /**
         * 播放到上一个项目
         * @param {Function} [callback] 回调
         * @returns {Banner}
         */
        prev: function (callback) {
            var the = this;
            var showIndex = the._showIndex;

            if (the._$items.length < 4) {
                return the;
            }

            showIndex = the._beforeShowIndex(-1, showIndex);
            the.index('prev', showIndex, callback);

            return the;
        },


        /**
         * 播放到下一个项目
         * @param {Function} [callback] 回调
         * @returns {Banner}
         */
        next: function (callback) {
            var the = this;
            var showIndex = the._showIndex;

            if (the._$items.length < 4) {
                return the;
            }

            showIndex = the._beforeShowIndex(1, showIndex);
            the.index('next', showIndex, callback);

            return the;
        },


        /**
         * 自动播放
         * @returns {Banner}
         */
        play: function () {
            var the = this;
            var options = the._options;

            if (the._$items.length < 4) {
                return the;
            }

            the._clear();

            if (!the._isPrivatePlay) {
                options.autoPlay = true;
            }

            the._playTimeID = setTimeout(function () {
                the.next();
                the.play();
            }, options.timeout);

            return the;
        },


        /**
         * 清除播放定时器
         * @private
         */
        _clear: function () {
            var the = this;

            if (the._playTimeID) {
                clearTimeout(the._playTimeID);
                the._playTimeID = 0;
            }
        },


        /**
         * 暂停动画
         * @returns {Banner}
         */
        pause: function () {
            var the = this;

            if (the._$items.length < 4) {
                return the;
            }

            the._options.autoPlay = false;
            the._clear();

            return the;
        },


        /**
         * 销毁实例
         */
        destroy: function () {
            var the = this;
            var set = the._calTranslate(0);

            dato.extend(set, {
                position: '',
                overflow: '',
                width: '',
                height: ''
            });

            // 移除所有事件
            event.un(the._$banner, 'touch1start touch1move touch1end tap click mouseenter mouseleave');

            // 停止动画
            the.pause();

            dato.each(the._$items, function (index, item) {
                attribute.css(item, {
                    position: '',
                    overflow: '',
                    width: '',
                    height: '',
                    float: ''
                });
            });
            attribute.css(the._$ele, set);
            modification.insert(the._$ele, the._$banner, 'afterend');
            dato.each(the._$clones, function (index, $clone) {
                modification.remove($clone);
            });
            modification.remove(the._$banner);
        }
    });

    modification.importStyle(style);


    /**
     * 构建一个 banner，标准的 DOM 结构为：<br>
     *     <code>ul#banner1>li*N</code>
     *
     * @param {HTMLElement|Node} ele 元素
     * @param {Object} [options] 配置
     * @param {Number} [options.width=700] banner 宽度，默认700
     * @param {Number} [options.height=300] banner 高度，默认300
     * @param {String} [options.item="li"] banner 项目，默认"li"
     * @param {Number} [options.duration=456] banner 播放动画时间，默认456，单位毫秒
     * @param {String} [options.easing="ease-in-out-back"] banner 播放动画缓冲效果，默认"ease-in-out-back"
     * @param {Number} [options.autoPlay=1] banner 自动播放，1为自动向后播放，-1为自动向前播放，其他为不自动播放
     * @param {String} [options.addClass=""] banner 添加的 className
     * @param {String} [options.navStyle="circle"] banner 导航的样式，内置有"circle"、"square"、"transparent"，如果为空则不显示导航
     * @param {String} [options.navText=""] banner 导航的是否输出导航数字，内置有"number"
     * @constructor
     */
    module.exports = Banner;
});