var AdminClicks = 0;
var AdminPassword = null;
var isAdminAuthenticated = false;
var couponLongPressTimer = null;
var isLongPress = false;
var SERVER_URL = "https://sauna.olaf-tnt.workers.dev";

UpdateActiveTimer();
document.getElementById("AdminPanel").style.display = 'none';
document.getElementById("AdminPanelSettings").style.display = 'none';
document.getElementById("CouponRedeemPanel").style.display = 'none';

setInterval(function () {AdminClicks = 0;}, 2500);
setInterval(function () {UpdateActiveTimer();}, 10000);

function UpdateActiveTimer()
{
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
       var Active = Number(xhttp.responseText) > 0;
       var ActiveTime = Math.round(Number(xhttp.responseText) / 60);

       if(ActiveTime == 0){
           ActiveTime = 1;
       }

       if(Active)
       {
           document.getElementById("PrcingElement").style.display = 'none';
           document.getElementById("ActiveDisplayTime").style.display = 'block';
           document.getElementById("ActiveTimeText").innerText = ActiveTime+" MIN";
       }else
       {
           document.getElementById("PrcingElement").style.display = 'block';
           document.getElementById("ActiveDisplayTime").style.display = 'none';
       }
       }
    };
     
    xhttp.open("GET", SERVER_URL + "/GetRemainingTimeRaw", true);
    xhttp.send();
}

function AdminSetActiveTime(AdminPass, Time) {
  alert(AdminPass+":"+Time);
  //Req_>
  UpdateActiveTimer();
}

// Coupon Redemption Functions
function RedeemCoupon(couponCode) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
            var resultDiv = document.getElementById("CouponRedeemResult");
            if (this.status == 200) {
                resultDiv.innerHTML = '<p class="text-success">Kupon zrealizowany pomyślnie!</p>';
                document.getElementById("CouponCodeInput").value = "";
                UpdateActiveTimer();
                setTimeout(function() {
                    document.getElementById("CouponRedeemPanel").style.display = 'none';
                    resultDiv.innerHTML = '';
                }, 2000);
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Błąd: Nieprawidłowy kod kuponu lub kupon został już wykorzystany.</p>';
            }
        }
    };
    xhttp.open("GET", SERVER_URL + "/UseCoupon?c=" + encodeURIComponent(couponCode.toUpperCase()), true);
    xhttp.send();
}

// Admin Authentication
function CheckAdminPassword(password) {
    return new Promise(function(resolve, reject) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    try {
                        var response = JSON.parse(this.responseText);
                        resolve(response.authorized === true);
                    } catch(e) {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            }
        };
        xhttp.open("GET", SERVER_URL + "/Admin?pw=" + encodeURIComponent(password), true);
        xhttp.send();
    });
}

// Generate Coupon
function GenerateCoupon(timeSeconds, name, expirationTime) {
    return new Promise(function(resolve, reject) {
        var xhttp = new XMLHttpRequest();
        var url = SERVER_URL + "/GenerateCoupon?t=" + encodeURIComponent(timeSeconds) + "&pw=" + encodeURIComponent(AdminPassword);
        if (name && name.trim() !== "") {
            url += "&n=" + encodeURIComponent(name);
        }
        if (expirationTime) {
            url += "&e=" + encodeURIComponent(expirationTime);
        }
        
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    try {
                        var response = JSON.parse(this.responseText);
                        resolve(response);
                    } catch(e) {
                        resolve({code: this.responseText.trim()});
                    }
                } else {
                    reject(new Error("Błąd generowania kuponu"));
                }
            }
        };
        xhttp.open("GET", url, true);
        xhttp.send();
    });
}

// List Coupons
function ListCoupons() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var resultDiv = document.getElementById("CouponResult");
            try {
                var coupons = JSON.parse(this.responseText);
                var html = '<div class="mt-3"><h6>Lista Kuponów:</h6><pre style="text-align: left; font-size: 0.9em;">' + JSON.stringify(coupons, null, 2) + '</pre></div>';
                resultDiv.innerHTML = html;
            } catch(e) {
                resultDiv.innerHTML = '<div class="mt-3"><pre>' + this.responseText + '</pre></div>';
            }
        }
    };
    xhttp.open("GET", SERVER_URL + "/ListCoupons?pw=" + encodeURIComponent(AdminPassword), true);
    xhttp.send();
}

// Event Listeners
document.getElementById("MainHeading").addEventListener("click", (event) => {
    AdminClicks++;

    if(AdminClicks==5 && !isAdminAuthenticated)
    {
        AdminClicks = 0;
        document.getElementById("AdminPanel").style.display = 'block';
    }
});

// Coupon Card Button - Click to show redeem panel
document.getElementById("CouponCardButton").addEventListener("click", (event) => {
    document.getElementById("CouponRedeemPanel").style.display = 'block';
    document.getElementById("CouponCodeInput").focus();
});

// Auto-uppercase coupon code input
document.getElementById("CouponCodeInput").addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase();
});

// Coupon Redeem Button - Long press for admin
function handleLongPressStart() {
    isLongPress = false;
    couponLongPressTimer = setTimeout(function() {
        isLongPress = true;
        if (!isAdminAuthenticated) {
            document.getElementById("CouponRedeemPanel").style.display = 'none';
            document.getElementById("AdminPanel").style.display = 'block';
        }
    }, 1000);
}

function handleLongPressEnd() {
    if (couponLongPressTimer) {
        clearTimeout(couponLongPressTimer);
        couponLongPressTimer = null;
    }
}

document.getElementById("CouponRedeemButton").addEventListener("mousedown", handleLongPressStart);
document.getElementById("CouponRedeemButton").addEventListener("mouseup", handleLongPressEnd);
document.getElementById("CouponRedeemButton").addEventListener("mouseleave", handleLongPressEnd);

// Touch events for mobile
document.getElementById("CouponRedeemButton").addEventListener("touchstart", handleLongPressStart);
document.getElementById("CouponRedeemButton").addEventListener("touchend", handleLongPressEnd);

// Redeem coupon on click (short press)
document.getElementById("CouponRedeemButton").addEventListener("click", (event) => {
    // Small delay to check if it was a long press
    setTimeout(function() {
        if (!isLongPress) {
            var couponCode = document.getElementById("CouponCodeInput").value.trim();
            if (couponCode) {
                RedeemCoupon(couponCode);
            } else {
                document.getElementById("CouponRedeemResult").innerHTML = '<p class="text-danger">Wpisz kod kuponu</p>';
            }
        }
        isLongPress = false;
    }, 100);
});

// Cancel coupon redeem
document.getElementById("CouponCancelButton").addEventListener("click", (event) => {
    document.getElementById("CouponRedeemPanel").style.display = 'none';
    document.getElementById("CouponCodeInput").value = "";
    document.getElementById("CouponRedeemResult").innerHTML = '';
});

// Admin login
document.getElementById("AdminButton").addEventListener("click", async (event) => {
    var password = document.getElementById("PasswordInput").value;
    var authorized = await CheckAdminPassword(password);
    
    if(authorized)
    {
        AdminPassword = password;
        isAdminAuthenticated = true;
        document.getElementById("MainHeading").innerText = "Administrator";
        document.getElementById("AdminPanel").style.display = 'none';
        document.getElementById("AdminPanelSettings").style.display = 'block';
        document.getElementById("PasswordInput").value = "";
    } else
    {
        alert("Hasło nieprawidłowe");
        AdminPassword = null;
        isAdminAuthenticated = false;
    }
});

// Admin set time
document.getElementById("AdminButtonSetTime").addEventListener("click", (event) => {
    var TimeInput = document.getElementById("AdminTimeSetInput").value.match(/\d+/);
    if (TimeInput) {
        AdminSetActiveTime(AdminPassword, TimeInput[0]);
    }
});

// Generate coupon
document.getElementById("AdminButtonGenerateCoupon").addEventListener("click", async (event) => {
    var timeInput = document.getElementById("CouponTimeInput").value.trim();
    var nameInput = document.getElementById("CouponNameInput").value.trim();
    var resultDiv = document.getElementById("CouponResult");
    
    if (!timeInput || isNaN(timeInput)) {
        resultDiv.innerHTML = '<p class="text-danger">Wprowadź prawidłowy czas w sekundach</p>';
        return;
    }
    
    resultDiv.innerHTML = '<p>Generowanie kuponu...</p>';
    
    try {
        var coupon = await GenerateCoupon(timeInput, nameInput, null);
        var couponCode = coupon.code || coupon;
        resultDiv.innerHTML = '<p class="text-success">Kupon wygenerowany!</p><p><strong>Kod: ' + couponCode + '</strong></p>';
        document.getElementById("CouponTimeInput").value = "";
        document.getElementById("CouponNameInput").value = "";
    } catch(error) {
        resultDiv.innerHTML = '<p class="text-danger">Błąd: ' + error.message + '</p>';
    }
});

// List coupons
document.getElementById("AdminButtonListCoupons").addEventListener("click", (event) => {
    ListCoupons();
});
