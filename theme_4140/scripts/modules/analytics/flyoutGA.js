define([
    "modules/jquery-mozu",
    "underscore"
], function($, _) {
    

    var flyOutGAHandler = {
        
        init: function() {
            this.LevelOneCategoryHandler();
            this.LevelOneTwoCategoryHandler();
            this.LevelThreeCategoryHadler();
        },

        LevelOneCategoryHandler: function() {
            $(".mz-sitenav-list .mz-sitenav-item a").click(function (e) {
                if($(e.currentTarget).attr("class") !== "mz-sitenav-sub-sub-item-link"){
                  const l1 = $(this).text().toLowerCase();
                  const eventData = {
                    custom_event: 'navigation',
                    event_params: {
                      event_act:'level 1 click',
                      event_lbl:l1
                   }
                  };
                  if (window.globalEventBus) {
                    window.globalEventBus.emit('dataLayerEvent', eventData);
                  }
                }
              });
        },

        LevelOneTwoCategoryHandler: function() {
            $(".mainCategories .categoriesBlock a").click(function () {
              var category1 = $('.catheading').text().toLowerCase(),
                  category2 = $(this).prop("title").toLowerCase(),
                  pageContext = require.mozuData("pagecontext"),
                  eventAct;

                  if(pageContext.cmsContext.template.path == 'parent-category' ) 
                      eventAct = category1 ? category1.concat(':', category2) : category2;

                  if(pageContext.cmsContext.template.path == 'home') 
                      eventAct = 'shop by category'.concat(":", category2);

                  var gtmEventObject = {
                    event:'eventTracker',
                    custom_event:'category navigation',
                    event_params: {
                      event_act: eventAct,
                      event_lbl: 'shop by category' 
                    }
                  };
              
                if (window.globalEventBus) window.globalEventBus.emit('dataLayerEvent', gtmEventObject);
            });
        },

        LevelThreeCategoryHadler: function() {
            $(".mz-sitenav-sub-sub-item-link").click(function (e) {
                const l3 = $(this).text().toLowerCase();
                const l2 = $(this).parents(".second-level-item").find(".mz-placeholder-sitenav-link").text().toLowerCase();
                const l1 = $(this).parents(".mz-sitenav-item-inner").find(".mz-sitenav-link").text().toLowerCase();
                const eventData = {
                  event:'eventTracker',
                  custom_event:'navigation',
                  event_params: {
                     event_act:'level 3 click',
                     event_lbl: l1 + ':' + l2 + ':' + l3
                  }
                };
                if (window.globalEventBus) {
                  window.globalEventBus.emit('dataLayerEvent', eventData);
                }
            });
        }
    };

    return flyOutGAHandler;
    
});