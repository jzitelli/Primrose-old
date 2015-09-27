/* global JSON_CONFIG */
var pyserver = {

    config: JSON_CONFIG,

    exec: function (src, success, logger) {
        "use strict"
        var xhr = new XMLHttpRequest();
        var data = new FormData();
        data.append("src", src);
        xhr.open("POST", '/pyexec');
        xhr.onload = function() {
            console.log("python success! stdout from python:");
            var response = JSON.parse(xhr.responseText);
            console.log(response.stdout);
            if (logger) {
                logger.log(response.stdout);
            }
            if (success) {
                success(response.return_value);
            }
        };
        xhr.send(data);
    },

    readFile: function (filename, success, logger) {
        "use strict"
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/read?file=" + filename);
        xhr.onload = function() {
            var response = JSON.parse(xhr.responseText);
            if (response.text) {
                success(response.text);
            } else if (response.error) {
                console.log(response.error);
                if (logger) {
                    logger.log(response.error);
                }
            }
        };
        xhr.send();
    }

};