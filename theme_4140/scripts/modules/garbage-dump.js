define([], function() {
    var GarbageDestructor = {
        session: function() {
            
            ['TransId', 'splitPayments','isAuthError', 'isKNETPaymentType','isApplePayPaymentType','isBenefitPayApply', 'isOmanNetApply', 'isQpayApply'].forEach(function(sessionKey) {
                sessionStorage.removeItem(sessionKey);
            });
        }
    };
    
    return GarbageDestructor;
});