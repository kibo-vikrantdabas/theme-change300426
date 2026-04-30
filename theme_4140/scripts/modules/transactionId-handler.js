define([
    'modules/api',
    'underscore',
], function(api, _) {

    var user = require.mozuData('user'),
        accountId = user.accountId,
        baseURL = '/api/commerce/customer/accounts/' + accountId + '/attributes',
        errorHandler = {
            "ITEM_NOT_FOUND": 0
        };

    var transactionIDHandler = {
        init: function(transactionId, paymentType) {
            return transactionIDHandler.addTransactionId(transactionId, paymentType);
        },

        addTransactionId: function(transactionId, paymentType) {
            return api.request("POST", baseURL, transactionIDHandler.createPayload(transactionId, paymentType));
        },

        createPayload: function(transactionId, paymentType) {

            var attributeName;
        
            if (paymentType === 'benefitcard') {
                attributeName = 'Tenant~customer-benefitpay-transaction-id';
            } else if (paymentType === 'omannet') {
                attributeName = 'Tenant~customer-omannet-transaction-id'; // ✅ New mapping for OmanNet
            } else if (paymentType === 'qpay') {
                attributeName = 'Tenant~customer-qpay-transaction-id'; // ✅ New mapping for QPay
            } else {
                attributeName = 'Tenant~customer-knet-transaction-id';
            }
            return {
                fullyQualifiedName: attributeName,
                values: [String(transactionId)]
            };
        },

        handleError: function(error) {
            switch (errorHandler[error.errorCode]) {
                case 0:
                    // Fallback logic (if needed)
                     console.warn("Attribute not found. Retry logic can be added here if needed.");
                    break;
                default:
                    console.log(error.message);
            }
        }
    };

    return transactionIDHandler;

});
