/*!
 * upload.js
 * @author ydr.me
 * @create 2014-10-09 15:29
 */


define(function (require, exports, module) {
    /**
     * @module parent/upload
     * @requires util/dato
     * @requires util/typeis
     * @requires core/communication/xhr
     */
    'use strict';

    var typeis = require('../../util/typeis.js');
    var dato = require('../../util/dato.js');
    var xhr = require('./xhr.js');
    var defaults = {
        url: location.href,
        data: null,
        // 如：'file'
        blobName: null,
//        如：'example.png'
//        fileName: null,
        file: null
    };

    exports.defaults = defaults;
    module.exports = function (options) {
        options = dato.extend(!0, {}, defaults, options);

        if (!options.file) {
            throw new Error('require param `file`');
        }

        var fileType = typeis(options.file);
        var files;
        var fd = new FormData();
        var name = options.blobName;

        switch (fileType) {
            case 'element':
                if (options.file.tagName !== 'INPUT' || options.file.type !== 'file') {
                    throw new Error('element tag must be a input file');
                }

                name = options.file.name;
                files = options.file.files || [];

                if (files.length === 1) {
                    fd.append(name, files[0]);
                } else {
                    dato.each(options.file.files, function (index, file) {
                        fd.append(name + '[]', file);
                    });
                }

                break;

            case 'blob':
                if (!options.blobName) {
                    throw new Error('require param `blobName`');
                }

                fd.append(name, options.file);
                break;
        }

        dato.each(options.data, function (key, val) {
            fd.append(key, val);
        });

        options.method = 'POST';
        options.data = fd;

        return xhr.ajax(options);
    };
});