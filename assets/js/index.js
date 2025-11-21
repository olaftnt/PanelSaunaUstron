var AdminClicks = 0;
var AdminPassword = null;
var isAdminAuthenticated = false;
var couponLongPressTimer = null;
var SERVER_URL = "https://saunaustron.r-mzyk.workers.dev";

UpdateActiveTimer();
// AdminPanel is already hidden in HTML, only show when needed
document.getElementById("AdminPanelSettings").style.display = 'none';
document.getElementById("CouponRedeemPanel").style.display = 'none';

setInterval(function () {AdminClicks = 0;}, 2500);
setInterval(function () {UpdateActiveTimer();}, 10000);

function UpdateActiveTimer()
{
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
       var remainingTime = Number(xhttp.responseText);
       var Active = remainingTime > 0;
       var ActiveTime = Math.round(remainingTime / 60);

       if(Active && ActiveTime > 0)
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

function AdminSetActiveTime(AdminPass, TimeMinutes) {
    return new Promise(function(resolve, reject) {
        // Convert minutes to seconds
        var timeSeconds = parseInt(TimeMinutes) * 60;
        
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    try {
                        var response = JSON.parse(this.responseText);
                        resolve(response);
                    } catch(e) {
                        // If response is not JSON, treat as success
                        resolve({success: true});
                    }
                    // Update timer display
                    UpdateActiveTimer();
                } else {
                    try {
                        var errorResponse = JSON.parse(this.responseText);
                        reject(new Error(errorResponse.error || "Błąd ustawiania czasu"));
                    } catch(e) {
                        reject(new Error("Błąd ustawiania czasu"));
                    }
                }
            }
        };
        xhttp.open("GET", SERVER_URL + "/SetTime?t=" + encodeURIComponent(timeSeconds) + "&pw=" + encodeURIComponent(AdminPass), true);
        xhttp.send();
    });
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
                    // Show the coupon card row again - remove inline style to restore default CSS
                    document.getElementById("CouponCardRow").style.removeProperty('display');
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
        console.log('expirationTime value:', expirationTime, 'type:', typeof expirationTime, 'isNaN:', isNaN(expirationTime));
        // Add expiration parameter if it's a valid number greater than 0
        if (expirationTime != null && !isNaN(expirationTime) && expirationTime > 0) {
            url += "&e=" + encodeURIComponent(expirationTime);
            console.log('✓ Adding expiration parameter e=', expirationTime);
        } else {
            console.log('✗ NOT adding expiration parameter - value:', expirationTime);
        }
        console.log('GenerateCoupon URL:', url);
        
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    var responseText = this.responseText.trim();
                    try {
                        var response = JSON.parse(responseText);
                        // If it's already an object with code, return it
                        if (response && typeof response === 'object') {
                            resolve(response);
                        } else {
                            // If parsed but not an object, treat as string code
                            resolve({code: String(response)});
                        }
                    } catch(e) {
                        // If not JSON, treat the whole response as the code
                        resolve({code: responseText});
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

// Delete Coupon
function DeleteCoupon(couponCode) {
    return new Promise(function(resolve, reject) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    try {
                        var response = JSON.parse(this.responseText);
                        if (response.success) {
                            resolve(response);
                        } else if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve(response);
                        }
                    } catch(e) {
                        reject(new Error("Błąd parsowania odpowiedzi"));
                    }
                } else {
                    try {
                        var errorResponse = JSON.parse(this.responseText);
                        reject(new Error(errorResponse.error || "Błąd usuwania kuponu"));
                    } catch(e) {
                        reject(new Error("Błąd usuwania kuponu"));
                    }
                }
            }
        };
        xhttp.open("GET", SERVER_URL + "/DeleteCoupon?c=" + encodeURIComponent(couponCode) + "&pw=" + encodeURIComponent(AdminPassword), true);
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
                var data = JSON.parse(this.responseText);
                var coupons = data.coupons || {};
                var html = '<div class="mt-3"><h6 class="mb-3">Lista Kuponów:</h6>';
                
                var couponCount = 0;
                for (var code in coupons) {
                    if (code === 'undefined' || coupons[code] === -1) continue;
                    var coupon = coupons[code];
                    couponCount++;
                    
                    var statusClass = coupon.used ? 'text-danger' : 'text-success';
                    var statusText = coupon.used ? 'Wykorzystany' : 'Aktywny';
                    var durationMin = Math.round(coupon.duration / 60);
                    var expiresText = coupon.expires ? new Date(coupon.expires * 1000).toLocaleString('pl-PL') : 'Brak';
                    var nameText = coupon.name && coupon.name !== code ? coupon.name : '-';
                    
                    html += '<div class="card mb-2" style="border-left: 4px solid ' + (coupon.used ? '#dc3545' : '#28a745') + ';" id="coupon-card-' + code + '">';
                    html += '<div class="card-body p-3">';
                    html += '<div class="d-flex justify-content-between align-items-start">';
                    html += '<div style="flex: 1;">';
                    html += '<h6 class="mb-1"><strong>' + code + '</strong></h6>';
                    html += '<p class="mb-1 small text-muted">Nazwa: ' + nameText + '</p>';
                    html += '<p class="mb-1 small">Czas: ' + durationMin + ' min (' + coupon.duration + ' sekund)</p>';
                    html += '<p class="mb-0 small">Wygasa: ' + expiresText + '</p>';
                    html += '</div>';
                    html += '<div class="d-flex flex-column align-items-end gap-2">';
                    html += '<span class="badge ' + statusClass + '">' + statusText + '</span>';
                    html += '<button class="btn btn-sm btn-danger delete-coupon-btn" data-coupon-code="' + code + '" style="font-size: 0.75rem;">Usuń</button>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }
                
                if (couponCount === 0) {
                    html += '<p class="text-muted">Brak kuponów</p>';
                }
                
                html += '</div>';
                resultDiv.innerHTML = html;
                
                // Add event listeners to delete buttons
                var deleteButtons = resultDiv.querySelectorAll('.delete-coupon-btn');
                deleteButtons.forEach(function(button) {
                    button.addEventListener('click', function() {
                        var couponCode = this.getAttribute('data-coupon-code');
                        if (confirm('Czy na pewno chcesz usunąć kupon "' + couponCode + '"?')) {
                            DeleteCoupon(couponCode).then(function(response) {
                                // Remove the coupon card from the list
                                var couponCard = document.getElementById('coupon-card-' + couponCode);
                                if (couponCard) {
                                    couponCard.style.transition = 'opacity 0.3s';
                                    couponCard.style.opacity = '0';
                                    setTimeout(function() {
                                        couponCard.remove();
                                        // Refresh the list to update count
                                        ListCoupons();
                                    }, 300);
                                } else {
                                    // If card not found, just refresh
                                    ListCoupons();
                                }
                            }).catch(function(error) {
                                alert('Błąd usuwania kuponu: ' + error.message);
                            });
                        }
                    });
                });
            } catch(e) {
                resultDiv.innerHTML = '<div class="mt-3"><p class="text-danger">Błąd parsowania danych: ' + e.message + '</p></div>';
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
    // Hide the coupon card row - use !important to override Bootstrap classes
    var couponCardRow = document.getElementById("CouponCardRow");
    couponCardRow.style.setProperty('display', 'none', 'important');
    // Show the redeem panel
    document.getElementById("CouponRedeemPanel").style.display = 'block';
    document.getElementById("CouponCodeInput").focus();
    console.log('Coupon card hidden, panel shown');
});

// Auto-uppercase coupon code input
document.getElementById("CouponCodeInput").addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase();
});

// Auto-uppercase coupon name input
document.getElementById("CouponNameInput").addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase();
});

// Coupon Redeem Button - Double click for admin on PC, long press for mobile
var couponClickCount = 0;
var couponClickTimer = null;

function handleCouponButtonClick() {
    couponClickCount++;
    if (couponClickTimer) {
        clearTimeout(couponClickTimer);
    }
    
    couponClickTimer = setTimeout(function() {
        if (couponClickCount === 1) {
            // Single click - redeem coupon
            var couponCode = document.getElementById("CouponCodeInput").value.trim();
            if (couponCode) {
                RedeemCoupon(couponCode);
            } else {
                document.getElementById("CouponRedeemResult").innerHTML = '<p class="text-danger">Wpisz kod kuponu</p>';
            }
        } else if (couponClickCount === 2) {
            // Double click - show admin panel
            if (!isAdminAuthenticated) {
                document.getElementById("CouponRedeemPanel").style.display = 'none';
                document.getElementById("AdminPanel").style.display = 'block';
            }
        }
        couponClickCount = 0;
    }, 300);
}

// Long press for mobile devices
function handleLongPressStart() {
    couponLongPressTimer = setTimeout(function() {
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

// PC: Double click for admin
document.getElementById("CouponRedeemButton").addEventListener("click", handleCouponButtonClick);

// Mobile: Long press for admin
document.getElementById("CouponRedeemButton").addEventListener("touchstart", handleLongPressStart);
document.getElementById("CouponRedeemButton").addEventListener("touchend", handleLongPressEnd);

// Cancel coupon redeem
document.getElementById("CouponCancelButton").addEventListener("click", (event) => {
    // Hide the redeem panel
    document.getElementById("CouponRedeemPanel").style.display = 'none';
    // Show the coupon card row again - remove inline style to restore default CSS
    document.getElementById("CouponCardRow").style.removeProperty('display');
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
        // Load coupons list automatically after login
        ListCoupons();
    } else
    {
        alert("Hasło nieprawidłowe");
        AdminPassword = null;
        isAdminAuthenticated = false;
    }
});

// Admin set time
document.getElementById("AdminButtonSetTime").addEventListener("click", async (event) => {
    var TimeInput = document.getElementById("AdminTimeSetInput").value.match(/\d+/);
    if (TimeInput) {
        var timeMinutes = TimeInput[0];
        try {
            await AdminSetActiveTime(AdminPassword, timeMinutes);
            alert("Czas został ustawiony na " + timeMinutes + " minut");
            document.getElementById("AdminTimeSetInput").value = "";
        } catch(error) {
            alert("Błąd: " + error.message);
        }
    } else {
        alert("Wprowadź prawidłowy czas w minutach");
    }
});

// Generate coupon
document.getElementById("AdminButtonGenerateCoupon").addEventListener("click", async (event) => {
    var timeMinutes = document.getElementById("CouponTimeInput").value;
    var nameInput = document.getElementById("CouponNameInput").value.trim();
    var expirationInput = document.getElementById("CouponExpirationInput").value;
    var resultDiv = document.getElementById("CouponResult");
    
    console.log('Raw expirationInput value:', expirationInput, 'type:', typeof expirationInput, 'length:', expirationInput ? expirationInput.length : 0);
    
    if (!timeMinutes || isNaN(timeMinutes) || timeMinutes <= 0) {
        resultDiv.innerHTML = '<p class="text-danger">Wybierz prawidłowy czas</p>';
        return;
    }
    
    // Convert minutes to seconds
    var timeSeconds = parseInt(timeMinutes) * 60;
    
    // Convert expiration datetime to Unix timestamp if provided
    var expirationTime = null;
    console.log('Checking expirationInput:', expirationInput, 'trimmed:', expirationInput ? expirationInput.trim() : 'N/A', 'condition result:', expirationInput && expirationInput.trim() !== '');
    
    // Check if expiration input has a value
    if (expirationInput) {
        var trimmedInput = expirationInput.trim();
        console.log('Trimmed expirationInput:', trimmedInput, 'length:', trimmedInput.length);
        
        if (trimmedInput !== '') {
            // date input returns value in format "YYYY-MM-DD"
            // We need to add time (end of day 23:59:59) and parse it correctly to get Unix timestamp
            // Add time to make it end of day (23:59:59)
            var dateWithTime = trimmedInput + 'T23:59:59';
            var expirationDate = new Date(dateWithTime);
            console.log('Date input:', trimmedInput);
            console.log('Date with time:', dateWithTime);
            console.log('Parsed expirationDate:', expirationDate, 'isValid:', !isNaN(expirationDate.getTime()));
            
            // Check if date is valid
            if (isNaN(expirationDate.getTime())) {
                resultDiv.innerHTML = '<p class="text-danger">Nieprawidłowa data wygaśnięcia</p>';
                return;
            }
            expirationTime = Math.floor(expirationDate.getTime() / 1000);
            console.log('✓ Expiration input:', trimmedInput);
            console.log('✓ Expiration date:', expirationDate);
            console.log('✓ Expiration timestamp:', expirationTime, 'type:', typeof expirationTime);
        } else {
            console.log('✗ Expiration input is empty string');
        }
    } else {
        console.log('✗ Expiration input is null/undefined');
    }
    
    console.log('Before GenerateCoupon call - expirationTime:', expirationTime, 'type:', typeof expirationTime);
    resultDiv.innerHTML = '<p>Generowanie kuponu...</p>';
    
    try {
        var coupon = await GenerateCoupon(timeSeconds, nameInput, expirationTime);
        
        // Handle different response formats
        var couponCode = '';
        if (typeof coupon === 'string') {
            couponCode = coupon;
        } else if (coupon && coupon.code) {
            couponCode = coupon.code;
        } else if (coupon && typeof coupon === 'object') {
            // Try to find code property or use first string value
            for (var key in coupon) {
                if (typeof coupon[key] === 'string') {
                    couponCode = coupon[key];
                    break;
                }
            }
            if (!couponCode) {
                couponCode = JSON.stringify(coupon);
            }
        } else {
            couponCode = String(coupon);
        }
        
        resultDiv.innerHTML = '<p class="text-success">Kupon wygenerowany!</p><p><strong>Kod: ' + couponCode + '</strong></p>';
        document.getElementById("CouponNameInput").value = "";
        document.getElementById("CouponExpirationInput").value = "";
        // Refresh coupons list after successful generation
        //ListCoupons();
    } catch(error) {
        resultDiv.innerHTML = '<p class="text-danger">Błąd: ' + error.message + '</p>';
    }
});

// List coupons
document.getElementById("AdminButtonListCoupons").addEventListener("click", (event) => {
    ListCoupons();
});

// Admin gear button - opens admin panel
document.getElementById("AdminGearButton").addEventListener("click", (event) => {
    if (!isAdminAuthenticated) {
        document.getElementById("AdminPanel").style.display = 'block';
        document.getElementById("CouponRedeemPanel").style.display = 'none';
        // Scroll to admin panel
        document.getElementById("AdminPanel").scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
