define([
    "hyprlive"
], function(Hypr) {

    var mobileLength = {
        'KW' :8,
        'AE': 9,
        'SA': 9,
        'BH': 8,
        'QA': 8,
        'OM': 8
    };
    
    var getMobileLength = function() {
        return mobileLength[Hypr.getThemeSetting('countrySpecificCode').toUpperCase()];
    };

    var setMobileNumberLength = function(event) {
        if(event.target.value.length > getMobileLength()) event.target.value = event.target.value.slice(0, getMobileLength());
    };

    var setMobileNumberValueLength = function(mobileNumber) {
        if(mobileNumber.length > getMobileLength()) 
            return mobileNumber.slice(0, getMobileLength());
        else 
            return mobileNumber;
    };

    var validateMobileNumber = function(mobileNumber) {
        if(mobileNumber.length > 0) {
            var phoneFirstDigit = mobileNumber[0];
            if(Hypr.getThemeSetting('countrySpecificCode').toUpperCase() == "AE") {
                return phoneFirstDigit==5;
            }
            else if(Hypr.getThemeSetting('countrySpecificCode').toUpperCase() == "KW") {
                return phoneFirstDigit==5 || phoneFirstDigit==4 || phoneFirstDigit==6 || phoneFirstDigit==9;
            }
            else if(Hypr.getThemeSetting('countrySpecificCode').toUpperCase() == "SA") {
                return phoneFirstDigit==5;
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }

    
    return {
         requriedMobileNumberLength:setMobileNumberLength,
         validateMobileNumberFormat:validateMobileNumber,
         requriedMobileNumberValueLength:setMobileNumberValueLength,
         getAllowedPhoneNumberLength:getMobileLength,

    };
});