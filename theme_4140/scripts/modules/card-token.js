define([
    'modules/api',
    'underscore',
    'modules/models-token'
], function(api, _, TokenModels) {

    var user = require.mozuData('user'),
        accountId = user.accountId,
        baseURL = '/api/commerce/customer/accounts/' + accountId +'/attributes',
        tokenObject = {
            cardId: '',
            tokenId: ''
        },
        payload = {
            fullyQualifiedName: 'Tenant~customer-card-details',
            values: [ ]
        },
        errorHandler = {
            "ITEM_NOT_FOUND" : 0
        };
    
    var cardTokenHandler = {
        init: function(cardData, cardId, tokenId, isDeletion) {

            if(user.isAnonymous) return;

            if(cardId) tokenObject.cardId = cardId;

            if(_.isUndefined(tokenId)) this.createTokenModel(cardData);

            if(tokenId) {
                tokenObject.cardId = cardId;
                if(!isDeletion) tokenObject.tokenId = tokenId;
            }

            if(!cardData) cardTokenHandler.getExistingTokenIdDetails(isDeletion);
        },

        getExistingTokenIdDetails: function(isDeletion) {
            api.request('GET', baseURL.concat('/', payload.fullyQualifiedName))
            .then(function(res) { 

                if(!_.isEmpty(res.values)) cardTokenHandler.updateTokenIds(res.values[0], isDeletion); 

            }, cardTokenHandler.handleError);
        },

        detailsCallback: function(res) { if(!_.isEmpty(res.values)) cardTokenHandler.updateTokenIds(res.values[0]); },

        addTokeId: function() { api.request("POST", baseURL, cardTokenHandler.createPayload()); },

        updateTokenIds: function(previousTokenIds, isDeletion) {  
            api.request("PUT", baseURL.concat('/', payload.fullyQualifiedName), cardTokenHandler.createPayload(previousTokenIds, isDeletion)); 
        },

        createPayload: function(previousTokenIds, isDeletion) { 
            if(payload.values.length) payload.values.length = 0;
            
            payload.values.push(cardTokenHandler.getTokenizedObject(previousTokenIds, isDeletion)); 
            return payload;
        },

        getTokenizedObject: function(previousTokenIds, isDeletion) {
            var tokenized = {};
            
            if(previousTokenIds) tokenized = JSON.parse(previousTokenIds);
             
            if(isDeletion) {
                delete tokenized[tokenObject.cardId];
            }
            else {
                tokenized[tokenObject.cardId] = tokenObject.tokenId;
            }
            
            return JSON.stringify(tokenized);
        },

        createTokenModel: function(card) {
            var cardTokenModel =  new TokenModels.Token({ type: 'EPGWALLET',  tokenObject: card });

            this.createNewTokenId(cardTokenModel);
            
        },

        createNewTokenId: function(cardTokenModel) { 
            cardTokenModel.apiCreate().then(cardTokenHandler.createTokenCallback, cardTokenHandler.handleError);
        },

        createTokenCallback: function(res) { 
            if(res.isSuccessful) {  
                tokenObject.tokenId = res.id; 
                cardTokenHandler.getExistingTokenIdDetails(false);
            } 
        },

        handleError: function(error) { 
            switch (errorHandler[error.errorCode]) {
                case 0:
                    cardTokenHandler.addTokeId();
                    break;
                default:
                    console.log(error.message);
            }
        }
    };
    
    return cardTokenHandler;
    
});