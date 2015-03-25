/* 
 * Copyright (C) 2015 Sean T. McBeth <sean@seanmcbeth.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var ctrls, prices;

function showSection(id, skipPush) {
    var tab;

    if (id) {
        tab = document.getElementById(id);
        if(!tab){
            tab = document.getElementsByTagName("article")[0];
            id = tab.id;
        }
        tab.className = "selected";
        tab.scrollTop = 0;
    }

    if (!isMobile || lastTab !== id) {
        if (lastTab) {
            tab = document.getElementById(lastTab);
            tab.className = "";
        }
        lastTab = lastTab === id ? null : id;
        tabs = document.querySelectorAll("#menu > a");
        var r = new RegExp(fmt("^javascript:showSection\\('($1)?'\\);$", lastTab));
        for (i = 0; i < tabs.length; ++i) {
            t = tabs[i];
            if (r.test(t.href)) {
                t.className = "selected button";
            }
            else {
                t.className = "button";
            }
        }
        var url = "#" + (lastTab || "");
        if (!skipPush) {
            history.pushState(null, "Primrose" + (lastTab ? " > " + lastTab : ""), url);
        }
        if(!window.hasOwnProperty("ga")){
            window.ga = function(){};
        }
        ga("send", "pageview", url);
    }
}

window.addEventListener("popstate", function (evt) {
    var nextTab = window.location.hash;
    if (nextTab.length > 0) {
        nextTab = nextTab.substring(1);
        showSection(nextTab, true);
    }
});

function makeItemPurchase(btn, lbl, stat, err, item) {
    if (!prices || prices[item] === undefined) {
        btn.className = "disabled button";
    }
    else {
        var purchaseError = false;
        var priceTag = fmt("$$1.00", prices.editor_license / 100);

        lbl.innerHTML = priceTag;

        function onPurchaseError(msg, ref) {
            console.error(msg, ref || "", errMsg, errMail, errRef);

            var errMsg = document.getElementById(err.id + "-msg");
            var errRef = document.getElementById(err.id + "-ref");
            var errMail = document.getElementById(err.id + "-email");

            errMsg.innerHTML = msg;
            errMail.innerHTML = "Sean T. McBeth &lt;sean@primroseeditor.com&gt;";
            errMail.href = "mailto:sean@primroseeditor.com";
            if (ref) {
                errRef.innerHTML += fmt("REF #: $1.", ref);
                errMail.href += fmt("?subject=Purchase Error REF #: $1", ref);
            }

            purchaseError = true;
            btn.className = "disabled button";
            err.style.display = "block";
        }

        function purchaseDone(result) {
            if (result.status === "ok") {
                var tk = document.getElementById(stat.id + "-token");
                var lic = document.getElementById(stat.id + "-license");

                tk.innerHTML = result.id;
                lic.innerHTML = result.license;

                stat.style.display = "block";
            }
            else {
                onPurchaseError(fmt("The purchase process with Stripe failed. Reason: $1.", result.error), result.id);
            }
        }

        var stripeHandler = StripeCheckout.configure({
            key: prices.stripe_public_key,
            image: 'images/logo128dark.png',
            name: 'Primrose Editor',
            zipCode: true,
            token: function (token) {
                token.item = item;
                sendObject(document.location.protocol + "//" + document.location.hostname + ":8082/purchase", token, onPurchaseError.bind(this, "We couldn't communicate with our own server.", token.id), purchaseDone);
            }
        });

        window.addEventListener('popstate', stripeHandler.close.bind(stripeHandler));
        btn.addEventListener("click", function () {
            if (!purchaseError) {
                stripeHandler.open({
                    description: "Proprietary license (" + priceTag + ")",
                    amount: prices[item]
                });
            }
        });
    }
}

function init() {
    ctrls = findEverything();
    var versionLabels = document.getElementsByClassName("version-label");
    for(var i = 0; i < versionLabels.length; ++i){
        versionLabels[i].innerHTML = Primrose.VERSION;
    }
    if (window.location.hash.length > 1) {
        showSection(window.location.hash.substring(1));
    }
    else {
        showSection('home');
    }

    getObject("data/config.json", function (config) {
        prices = config;
        makeItemPurchase(ctrls.buyLicenseButton, ctrls.licensePrice, ctrls.purchaseSuccess, ctrls.purchaseError, "editor_license");
    });

    if (navigator.getVRDevices) {
        navigator.getVRDevices()
                .then(gotVRDevices)
                .catch(PrimroseDemo);
    } else if (navigator.mozGetVRDevices) {
        navigator.mozGetVRDevices(gotVRDevices);
    }
    else if (isMobile) {
        ctrls.goVR.style.display = "none";
        ctrls.goRegular.style.display = "none";
        document.body.removeChild(ctrls.outputContainer);
    }
    else {
        PrimroseDemo();
    }
}