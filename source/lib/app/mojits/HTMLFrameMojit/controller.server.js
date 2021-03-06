/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


YUI.add('HTMLFrameMojit', function(Y, NAME) {

    var renderListAsHtmlAssets = function(list, type) {
        var i,
            data = '',
            url;

        if ('js' === type) {
            for (i = 0; i < list.length; i += 1) {
                // Escape any HTML chars in the URL to avoid trivial attribute
                // injection attacks.
                url = Y.Escape.html(list[i]);
                data += '<script type="text/javascript" src="' +
                    url + '"></script>\n';
            }
        } else if ('css' === type) {
            for (i = 0; i < list.length; i += 1) {
                // Escape any HTML chars in the URL to avoid trivial attribute
                // injection attacks.
                url = Y.Escape.html(list[i]);
                data += '<link rel="stylesheet" type="text/css" href="' +
                    url + '"/>\n';
            }
        } else if ('blob' === type) {
            for (i = 0; i < list.length; i += 1) {
                // NOTE: Giant security hole...but used by everyone who uses
                // Mojito so there's not much we can do except tell authors of
                // Mojito applications to _never_ use user input to generate
                // blob content or populate config data. Whatever goes in here
                // can't be easily encoded without the likelihood of corruption.
                data += list[i] + '\n';
            }
        } else {
            Y.log('Unknown asset type "' + type + '". Skipped.', 'warn', NAME);
        }

        return data;
    };
    var renderMetaTagAttributes = function(arrayMeta) {
        //if application.json contains
        // "specs": {
        //     "frame": {
        //         "type": "HTMLFrameMojit",
        //         "config": {
        //             "title": "Hello App",
        //------->     "meta": [{
        //                 "name": "hello",
        //                 "content": "hi"
        //             }],
        //             ...
        //this function returns 
        // [
        //     {
        //         "attributes": [
        //             {
        //                 "name": "name",
        //                 "value": "hello"
        //             },
        //             {
        //                 "name": "content",
        //                 "value": "hi"
        //             }
        //         ]
        //     }
        // ]

        var i = 0,
        metaLen, metaTags = [],
        attributeObj,
        getAttributes = function (obj) {
            var attrs = [],
                name;
            for (name in obj) {
                if (obj.hasOwnProperty(name)) {
                    attrs.push({
                        "name": name,
                        "value": obj[name],
                    });
                }
            }
            return attrs;
        };

        if (!Array.isArray(arrayMeta)) {
            return undefined;
        }

        metaLen = arrayMeta.length;
        for (i = 0; i < metaLen; i++) {
            attributeObj = arrayMeta[i];
            metaTags.push({
                "attributes": getAttributes(attributeObj)
            })
        }
        return metaTags;
    };

    Y.mojito.controllers[NAME] = {

        index: function(ac) {
            this.__call(ac);
        },


        __call: function(ac) {

            // Grab the "child" from the config an add it as the
            // only item in the "children" map.
            var child = ac.config.get('child'),
                cfg;

            // Map the action to the child if the action
            // is not specified as part of the child config.
            child.action = child.action || ac.action;

            // Create a config object for the composite addon
            cfg = {
                children: {
                    child: child
                },
                assets: ac.config.get('assets')
            };

            Y.log('executing HTMLFrameMojit child', 'mojito', 'qeperf');

            // Now execute the child as a composite
            ac.composite.execute(cfg, function(data, meta) {

                // Make sure we have meta
                meta.http = meta.http || {};
                meta.http.headers = meta.http.headers || {};

                // Make sure our Content-type is HTML
                meta.http.headers['content-type'] =
                    'text/html; charset="utf-8"';

                // Set the default data
                data.title = ac.config.get('title') ||
                    'Powered by Mojito ' + Y.mojito.version;
                data.mojito_version = Y.mojito.version;

                //set meta tags from app config
                data.meta = renderMetaTagAttributes(ac.config.get('meta'));


                // Add all the assets we have been given to our local store
                ac.assets.addAssets(meta.assets);

                // If we are deploying to the client get all the assets required
                if (ac.config.get('deploy') === true) {
                    ac.deploy.constructMojitoClientRuntime(ac.assets,
                        meta.binders);
                }

                // Attach assets found in the "meta" to the page
                Y.Object.each(ac.assets.getAssets(), function(types, location) {
                    if (!data[location]) {
                        data[location] = '';
                    }
                    Y.Object.each(types, function(assets, type) {
                        data[location] += renderListAsHtmlAssets(assets, type);
                    });
                });

                meta.view = {name: 'index'};

                Y.log('HTMLFrameMojit done()', 'mojito', 'qeperf');

                ac.done(data, meta);
            });
        }
    };

}, '0.1.0', {requires: [
    'mojito-assets-addon',
    'mojito-deploy-addon',
    'mojito-config-addon',
    'escape'
]});
