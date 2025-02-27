/*!
 * 图片裁剪
 * @author ydr.me
 * @create 2014-10-28 15:21
 */


define(function (require, exports, module) {
    /**
     * @module ui/Imgclip/index
     * @requires libs/Template
     * @requires util/dato
     * @requires util/class
     * @requires core/dom/selector
     * @requires core/dom/modification
     * @requires core/dom/attribute
     * @requires core/dom/animation
     * @requires core/event/drag
     * @requires ui/Resize/index
     * @requires ui/generator
     */
    'use strict';

    var style = require('text!./style.css');
    var template = require('text!./template.html');
    var Template = require('../../libs/Template.js');
    var dato = require('../../util/dato.js');
    var generator = require('../generator.js');
    var selector = require('../../core/dom/selector.js');
    var modification = require('../../core/dom/modification.js');
    var attribute = require('../../core/dom/attribute.js');
    var animation = require('../../core/dom/animation.js');
    var event = require('../../core/event/drag.js');
    var Resize = require('../Resize/index.js');
    var animationOptions = {
        duration: 345
    };
    var alienIndex = 1;
    var defaults = {
        minWidth: 0,
        minHeight: 0,
        maxWidth: 0,
        maxHeight: 0,
        ratio: 0
    };
    var Imgclip = generator({
        STATIC: {
            defaults: defaults
        },
        constructor: function ($ele, options) {
            var the = this;
            var adjust;

            $ele = selector.query($ele);

            if (!$ele.length) {
                throw 'instance require an element';
            }

            the._$ele = $ele[0];
            the._options = options = dato.extend(!0, {}, defaults, options);

            adjust = _adjustSize(options.minWidth, options.minHeight, options.ratio, !0);
            options.minWidth = adjust[0];
            options.minHeight = adjust[1];

            if (the._$ele.complete) {
                the._init();
            } else {
                event.on(the._$ele, 'load', the._init.bind(the));
            }
        },
        _init: function () {
            var the = this;
            var tpl = new Template(template);
            var wrap;
            var $ele = the._$ele;
            var $img = $ele.cloneNode(!0);
            var $wrap;

            the._id = alienIndex++;
            wrap = tpl.render({
                id: the._id
            });

            $wrap = the._$wrap = modification.parse(wrap)[0];
            modification.insert($wrap, $ele, 'afterend');

            // 外围尺寸
            the._wrapWidth = attribute.width($ele);
            the._wrapHeight = attribute.height($ele);

            // 选区最大尺寸
            the._maxWidth = the._wrapWidth;
            the._maxHeight = the._wrapHeight;

            attribute.css($wrap, {
                position: 'absolute',
                width: the._wrapWidth,
                height: the._wrapHeight
            });
            attribute.top($wrap, attribute.top($ele));
            attribute.left($wrap, attribute.left($ele));
            the._$sele = selector.query('.alien-ui-imgclip-selection', $wrap)[0];
            the._$bg = selector.query('.alien-ui-imgclip-bg', $wrap)[0];
            the._$in = selector.query('.alien-ui-imgclip-in', $wrap)[0];
            modification.insert($img, the._$sele, 'afterbegin');
            the._$img = $img;
            // 重置选区
            the._reset();
            the._resize = new Resize(the._$sele, the._options);
            the._on();
            the.on('clipstart clipend', the._updateClipRange);

            return the;
        },
        /**
         * 更新选区的范围
         * @private
         */
        _updateClipRange: function () {
            var the = this;
            var options = the._options;
            var maxWidth = the._wrapWidth - the._selection.left;
            var maxHeight = the._wrapHeight - the._selection.top;
            var adjust = _adjustSize(maxWidth, maxHeight, options.ratio);

            the._maxLeft = the._wrapWidth - the._selection.width;
            the._maxTop = the._wrapHeight - the._selection.height;
            the._resize.setOptions({
                minWidth: options.minWidth,
                minHeight: options.minHeight,
                maxWidth: the._maxWidth = adjust[0],
                maxHeight: the._maxHeight = adjust[1]
            });
        },
        /**
         * 重置选区
         * @private
         */
        _reset: function () {
            var the = this;

            the._selection = {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            };
        },
        _on: function () {
            var the = this;
            var x0;
            var y0;
            var left0;
            var top0;
            // 0 无选区
            // 1 正在选区
            // 2 已有选区
            // 3 移动选区
            // 4 缩放选区
            var state = 0;
            var isReset = !1;
            var options = the._options;

            event.on(the._$wrap, 'dragstart', function (eve) {
                var left;
                var top;

                eve.preventDefault();

                // 开始新选区
                if (state === 0 || state === 2) {
                    isReset = state === 2;
                    state = 1;
                    left = attribute.left(the._$wrap);
                    top = attribute.top(the._$wrap);
                    x0 = eve.pageX;
                    y0 = eve.pageY;
                    attribute.css(the._$bg, 'display', 'block');
                    attribute.css(the._$sele, {
                        display: 'block',
                        left: the._selection.left = x0 - left,
                        top: the._selection.top = y0 - top,
                        width: 0,
                        height: 0
                    });
                    attribute.css(the._$img, {
                        left: -the._selection.left,
                        top: -the._selection.top
                    });
                    the.emit('clipstart', the._selection);
                }
            });

            event.on(the._$wrap, 'drag', function (eve) {
                eve.preventDefault();
                var width;
                var height;
                var adjust;

                if (state === 1) {
                    width = eve.pageX - x0;
                    height = eve.pageY - y0;

                    if (width > the._maxWidth) {
                        width = the._maxWidth;
                    }

                    if (height > the._maxHeight) {
                        height = the._maxHeight;
                    }

                    adjust = _adjustSize(width, height, options.ratio);
                    width = adjust[0];
                    height = adjust[1];

                    attribute.css(the._$sele, {
                        width: the._selection.width = width,
                        height: the._selection.height = height
                    });
                    the.emit('clip', the._selection);
                }
            });

            event.on(the._$wrap, 'dragend', function (eve) {
                var deltaLeft;
                var deltaTop;
                var selectionProp = {};
                var imgProp = {};

                eve.preventDefault();

                if (state === 1) {
                    state = 2;

                    // 1. 调整尺寸
                    if (the._selection.width < options.minWidth) {
                        selectionProp.width = the._selection.width = options.minWidth;
                        //animation.animate(the._$sele, {
                        //    width: the._selection.width = options.minWidth
                        //}, animationOptions);
                    }

                    if (the._selection.height < options.minHeight) {
                        selectionProp.height = the._selection.height = options.minHeight;
                    }

                    // 2. 调整位置
                    if ((deltaLeft = the._selection.width + the._selection.left - the._wrapWidth) > 0) {
                        selectionProp.left = the._selection.left -= deltaLeft;
                        imgProp.left = -the._selection.left;
                    }

                    if ((deltaTop = the._selection.height + the._selection.top - the._wrapHeight) > 0) {
                        selectionProp.top = the._selection.top -= deltaTop;
                        imgProp.top = -the._selection.top;
                    }

                    animation.animate(the._$sele, selectionProp, animationOptions);
                    animation.animate(the._$img, imgProp, animationOptions);

                    the.emit('clipend', the._selection);
                }
            });

            event.on(the._$sele, 'dragstart', function (eve) {
                eve.preventDefault();

                if (state === 2) {
                    state = 3;
                    left0 = dato.parseFloat(attribute.css(the._$sele, 'left'), 0);
                    top0 = dato.parseFloat(attribute.css(the._$sele, 'top'), 0);
                    x0 = eve.pageX;
                    y0 = eve.pageY;
                    the.emit('clipstart', the._selection);
                }
            });

            event.on(the._$sele, 'drag', function (eve) {
                eve.preventDefault();

                var left;
                var top;

                if (state === 3) {
                    left = left0 + eve.pageX - x0;
                    top = top0 + eve.pageY - y0;

                    if (left <= 0) {
                        left = 0;
                    } else if (left >= the._maxLeft) {
                        left = the._maxLeft;
                    }

                    if (top <= 0) {
                        top = 0;
                    } else if (top >= the._maxTop) {
                        top = the._maxTop;
                    }

                    the._selection.left = left;
                    the._selection.top = top;

                    attribute.css(the._$sele, {
                        left: left,
                        top: top
                    });
                    attribute.css(the._$img, {
                        left: -left,
                        top: -top
                    });
                    the.emit('clip', the._selection);
                }
            });

            event.on(the._$sele, 'dragend', function (eve) {
                eve.preventDefault();

                if (state === 3) {
                    state = 2;
                    the.emit('clipend', the._selection);
                }
            });

            the._resize.on('resizestart', function () {
                if (state === 2) {
                    state = 4;
                    the.emit('clipstart', the._selection);
                }
            });

            the._resize.on('resize', function (size) {
                if (state === 4) {
                    the._selection.width = size.width;
                    the._selection.height = size.height;
                    the.emit('clip', the._selection);
                }
            });

            the._resize.on('resizeend', function () {
                if (state === 4) {
                    state = 2;
                    the.emit('clipend', the._selection);
                }
            });

            event.on(the._$bg, 'click', function () {
                if (state === 2) {
                    if (isReset) {
                        isReset = !1;
                    } else {
                        state = 0;
                        attribute.css(the._$bg, 'display', 'none');
                        attribute.css(the._$sele, 'display', 'none');
                        the._reset();
                        the.emit('destroy', the._selection);
                    }
                }
            });
        },
        _un: function () {
            var the = this;

            event.un(the._$wrap, 'dragstart');
            event.un(the._$wrap, 'drag');
            event.un(the._$wrap, 'dragend');
            event.un(the._$sele, 'dragstart');
            event.un(the._$sele, 'drag');
            event.un(the._$sele, 'dragend');
            event.un(the._$bg, 'click');
        },
        /**
         * 销毁实例
         */
        destroy: function () {
            var the = this;

            the._un();
            the._resize.destroy();
            modification.remove(the._$wrap);
        }
    });

    modification.importStyle(style);
    module.exports = Imgclip;


    /**
     * 按比例校准尺寸
     * @param width
     * @param height
     * @param ratio
     * @param [isReferToSmaller=false] {Boolean} 是否参照小边，默认false
     * @returns {Array}
     * @private
     */
    function _adjustSize(width, height, ratio, isReferToSmaller) {
        if (!ratio) {
            return [width, height];
        }

        if (!width && !height) {
            return [0, 0];
        }

        if (!width) {
            return [height * ratio, height];
        }

        if (!height) {
            return [width, width / ratio];
        }

        return width / height > ratio ?
            (isReferToSmaller ? [width, width / ratio] : [height * ratio, height]) :
            (isReferToSmaller ? [height * ratio, height] : [width, width / ratio]);
    }
});