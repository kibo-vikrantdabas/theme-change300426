define(['underscore', 'hyprlive'], function(_, Hypr) {
    var countryCityCallBack  = function(res) {
        return res.countryCode == Hypr.getThemeSetting('countrySpecificCode') ; 
    };

    var getCountryCities =  function() {
        return _.find(require.mozuData("aramexcountries"), countryCityCallBack);
    };
    
    return getCountryCities;
});