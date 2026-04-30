define([
    'modules/jquery-mozu',
    'underscore',
    'modules/models-token',
    'modules/checkout/payment/BlueWalletAction'
], function ($, _, TokenModels, BlueWalletAction) {

    var pageContext = require.mozuData('pagecontext'),
        BluePayAction = {};

    var BluePrepaidCardAction = {

        setInitialBluePrepaidCardPaymentState: function (isDisplay, isDisplayBluePaymentMethods) {
            this.model.set('displayBluePrepaidForm', isDisplay ? true : false);
            this.model.set('isCardError', false);
            this.model.set('isCardExpired', false);
            this.model.set('isCardNumberOrPinError', false);
            this.model.set('displayBluePrepaidAmountCapture', false);
            this.model.set('displayBluePaymentMethods', isDisplayBluePaymentMethods ? true : false);
            this.model.set('prepaidCardNumber', '');
            this.model.set('prepaidCardPin', '');
            if (isDisplay) setTimeout(function () { document.getElementById('mz-submitPrepaidCardDetails').disabled = true; }, 1000);
        },

        listenBluePrepaidStateChange: function () {
            this.listenTo(this.model, 'change:displayBluePrepaidForm', this.render);
            this.listenTo(this.model, 'change:displayBluePrepaidAmountCapture', this.render);
            this.listenTo(this.model, 'change:isCardError', this.render);
            this.listenTo(this.model, 'change:isCardExpired', this.render);
            this.listenTo(this.model, 'change:isCardNumberOrPinError', this.render);
        },

        proceedToPrepaid: function (_BluePayAction) {

            Object.assign(BluePayAction, _BluePayAction);

            this.model.set('hasPrepaidSelected', true);

            BluePrepaidCardAction.setInitialBluePrepaidCardPaymentState.call(this, true, false);
            BlueWalletAction.setInitialBlueWalletPaymentState.call(this, false, false, false);

            if (window.matchMedia('(min-width: 712px)').matches && window.matchMedia('(max-width:765px)').matches) {
                $(".mz-blue-popup").css("height", "550px");
            }

            else if (window.matchMedia('(min-width: 768px)').matches && window.matchMedia('(max-width:1138px)').matches) {
                $(".mz-blue-popup").css("height", "450px");
            }

            else if (window.matchMedia('(min-width: 1137px)').matches && window.matchMedia('(max-width:1139px)').matches) {
                $(".mz-blue-popup").css("height", "450px");
            }
        },
        submitCardDetail: function () {

            var self = this,
                cardNumber = self.model.get('prepaidCardNumber').trim(),
                cardPinNumber = self.model.get('prepaidCardPin').trim();
            self.model.set('isAllowLoading', true);

            if (!_.isUndefined(cardNumber) && !_.isUndefined(cardPinNumber) && !_.isEqual(cardNumber, '') && !_.isEqual(cardPinNumber, '')) {
                var cardDetailsObject = {
                    "cardNumber": cardNumber,
                    "cardPin": cardPinNumber
                };


                self.bluePayToken = new TokenModels.Token({ type: 'BLUEPREPAIDCARD', tokenObject: cardDetailsObject });
                self.bluePayToken.apiCreate().then(function (res) {
                    if (res.isSuccessful) {
                        var bluePaymentServiceTokenId = res.id;

                        self.bluePayToken.apiModel.thirdPartyPaymentExecute({
                            methodName: "session",
                            cardType: "BLUEPREPAIDCARD",
                            tokenId: bluePaymentServiceTokenId,
                        }).then(function (response) {
                            if (response.Authcode) {
                                var deductAmount = BluePayAction.getDeductAmount(response.prepaidBalance);

                                window.order.set('isPrepaidDeducation', true);
                                window.order.unset('isWalletDeducation');
                                window.order.set('prepaidDeducation', deductAmount);


                                self.model.set('tokenID', bluePaymentServiceTokenId);
                                self.model.set('bluePrepaidCardBalance', Number(response.prepaidBalance).toFixed(pageContext.currencyInfo.precision));
                                self.model.set('isAllowLoading', false);

                                BluePayAction.displayDeductBalance.call(self);
                            }
                            else {
                                BluePrepaidCardAction.cardErrorMessage.call(self, response.message);
                                self.model.set('isAllowLoading', false);
                            }
                        }, function (error) {
                            console.log(error.message);
                        });
                    }

                });
            }
        },

        handlePrepaidCardPin: function (event) {

            BluePayAction.handleArrowKeyInput.call(this, 'prepaidCardPin', event);

            if (event.target.value.length > 6) {
                event.target.value = event.target.value.substr(0, 6);
                this.model.set('prepaidCardPin', event.target.value);
            }

            if (this.model.get('prepaidCardNumber').length > 0) 
                document.getElementById('mz-submitPrepaidCardDetails').disabled = event.target.value.length == 6 ? false : true;

        },
        handlePrepaidCardNumber: function (event) {
            BluePayAction.handleArrowKeyInput.call(this, 'prepaidCardNumber', event);

            if (this.model.get('prepaidCardPin').length > 5) 
                document.getElementById('mz-submitPrepaidCardDetails').disabled = event.target.value.length > 1 ? false : true;
        },
        setPrepaidCardDetails: function () {
            var cardPin = $(".mz-card-pin-input").val(),
                cardNumber = $('.mz-card-number-input').val();
            this.model.set('prepaidCardNumber', cardNumber);
            this.model.set('prepaidCardPin', cardPin);
        },
        checkFreezCardPin: function (event) {
            if (event.target.value.length > 5) return false;
        },
        cardErrorMessage: function (msg) {
            msg = msg.toLowerCase();
            var key = msg.includes('expired') ? 1 : msg.includes('deactivated') ? 2 : 3;
            switch (key) {
                case 1:
                    BluePrepaidCardAction.cardNumberOrPinError.call(this, false);
                    BluePrepaidCardAction.manageCardError.call(this, true, true);
                    break;
                case 2:
                    BluePrepaidCardAction.cardNumberOrPinError.call(this, false);
                    BluePrepaidCardAction.manageCardError.call(this, true, false);
                    break;
                case 3:
                    BluePrepaidCardAction.cardNumberOrPinError.call(this, true);
                    break;
            }
        },
        cardNumberOrPinError: function (isDisplay) {
            this.model.set('isCardNumberOrPinError', isDisplay ? true : false);
            if (isDisplay) BluePrepaidCardAction.manageCardError.call(this, false);
        },
        manageCardError: function (isDisplay, isCardExpired) {
            this.model.set('isCardError', isDisplay ? true : false);
            this.model.set('isCardExpired', isCardExpired ? true : false);
        },

        setStateBluePrepaidPayment: function (deductAmount) {
            window.order.set('prepaidDeducation', deductAmount);
            this.model.set('displayBluePrepaidForm', false);
            this.model.set('displayBluePrepaidAmountCapture', true);
            this.model.set('displayBlueWalletAmountCapture', false);
        },


    };

    return BluePrepaidCardAction;

});