define([
    'modules/api',
    'underscore',
], function(api, _) {

    var user = require.mozuData('user'),
        accountId = user.accountId,
        baseURL = '/api/commerce/customer/accounts/' + accountId +'/attributes',
        payload = {
            fullyQualifiedName: 'Tenant~customer-applepay-transaction-id',
            values: [ ]
        },
        errorHandler = {
            "ITEM_NOT_FOUND" : 0
        };
    
    var transactionIDHandler = {
        init: function(transactionId) {
            return transactionIDHandler.addTransactionId(transactionId);            
        },

        addTransactionId: function(transactionId) { return api.request("POST", baseURL, transactionIDHandler.createPayload(transactionId)); },

        createPayload: function(transactionId) { 
            
            payload.values.push(String(transactionId)); 
            return payload;
        },

        handleError: function(error) { 
            switch (errorHandler[error.errorCode]) {
                case 0:
                    transactionIDHandler.addTransactionId();
                    break;
                default:
                    console.log(error.message);
            }
        }
    };
    
    return transactionIDHandler;
    
});