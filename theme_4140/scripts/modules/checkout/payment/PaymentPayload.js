define(['modules/jquery-mozu'], function($) {
    var apiContext = require.mozuData('apicontext');

    var paymentPayload = {
        
        createPaymentPayload : function(tokenType, responseId, paidAmount) {
            var payload = {
                amount: paidAmount,
                currencyCode: apiContext.headers['x-vol-currency'],
                newBillingInfo: paymentPayload.getBillingInfo.call(this, tokenType, responseId)
              };
              return payload;
        },
        getBillingEmail : function() {
            var user = require.mozuData('user');
            if (user && user.email) return user.email;
            return $.cookie('guestUserEmail');
        },
        getBillingAddress : function() {
            var billingAddress = {
                address1: this.get('address').get('address1'),
                address2: this.get('address').get('address2') || null,
                address3: this.get('address').get('address3') || null,
                address4: this.get('address').get('address4') || null,
                cityOrTown: this.get('address').get("cityOrTown"),
                stateOrProvince: this.get('address').get("stateOrProvince"),
                postalOrZipCode: this.get('address').get("postalOrZipCode"),
                countryCode: this.get('address').get("countryCode")
            };
            return billingAddress;
        },
        getBillingInfo : function (tokenType, responseId) {
            var billingInfo = {
                paymentType: 'token',
                billingContact: {
                    email: paymentPayload.getBillingEmail(),
                    firstName: this.get('firstName'),
                    lastNameOrSurname:this.get('lastNameOrSurname'),
                    phoneNumbers: {
                        home: this.get('phoneNumbers').get('home')
                    },
                    address: paymentPayload.getBillingAddress.call(this),
                    orderId:this.get('orderId')
                },
                token: {
                    paymentServiceTokenId: responseId,
                    type: tokenType
                },
                data:{
                    bluePaymentType:tokenType
                }
            };

            return billingInfo;
        }
    };

    return paymentPayload;
});