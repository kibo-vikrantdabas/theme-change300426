define(["modules/jquery-mozu", "modules/api", "underscore",'hyprlivecontext','hyprlive'], function($, api, _ ,HyprLiveContext,Hypr) {
    var displayCountrySelector = function (addedClass, removedClass) {
        $(".mz-menu-footer-country-selector")
          .addClass(addedClass)
          .removeClass(removedClass);
      };
      var displayCountryDropdown = function () {
        $(".mz-menu-footer-country-selector").on("click", function () {
          if($(".mz-menu-country-dropdown-selector").hasClass('deactive'))
          {
            $(".mz-menu-country-dropdown-selector")
            .addClass("is-active")
            .removeClass("deactive");
            var Mql1 = window.matchMedia(
              "screen and (min-width: 390px) and (max-width: 414px)"
            );
            if(Mql1.matches){
              $('.mz-hamburgmenu-option-container').scrollTop(0);
            }
            $('.mz-hamburgmenu-option-container').animate({scrollTop:$('.mz-menu-footer').position().top}, 'slow');
            $(".language-option").css("display", "none");
              var id2 = $(".country-data-field :selected").data("mz-id");
              
              api
                .request(
                  "GET",
                  "/api/platform/entitylists/siteurls@afg/entities/" + id2,
                  {pageSize:200}
                )
                .then(function (res) {
                  var languageValue1 = res.langOptions;
                  var flagUrlM = res.flagURL;
                  document.getElementById("flag-icon-mobile").src= flagUrlM;
                  document.getElementById("languageId").innerHTML =
                    "<option selected data-mz-site= 'https:" +
                    languageValue1[0].URL +
                    "'>" +
                    languageValue1[0].Language +
                    "</option>";
                  languageValue1.forEach(function (element, index) {
                    var langData1 = element.Language;
                    var langUrl1 = element.URL;
                    if (index > 0) {
                      document.getElementById("languageId").innerHTML +=
                        "<option class='mz-language-value' data-mz-site= 'https:" +
                        langUrl1 +
                        "'>" +
                        langData1 +
                        "</option>";
                    }
                    document.getElementById("langIdPhone").value = languageValue1[0].URL;
                  });
                });
                $(this).addClass("is-open");
          }else{
            $(".mz-menu-country-dropdown-selector")
            .addClass("deactive")
            .removeClass("is-active");
            $(this).removeClass("is-open");
          }
        });
      };
      var displayCountrySelectorPopup = function () {
        var mql = window.matchMedia(
          "screen and (min-width: 768px) and (max-width: 820px"
        );
        var mql2 = window.matchMedia(
          "screen and (min-width: 1024px) and (max-width: 1180px"
        );
        $(".mz-country-section").on("click", function () {
          $(".mz-country-selector-popover-container")
            .addClass("active")
            .removeClass("deactive");
          $(".mz-backdrop").addClass("active").removeClass("deactive");
          $(".mz-backdrop").attr(
            "style",
            "top:0% !important; height:" + $(document).height() + "px !important;"
          );
          $(".mz-country-selector-popover-container").animate(
            { right: "0px" },
            "slow"
          );
          $('.mz-homepage').css('overflow', 'hidden');
          $(".language-option").css("display", "none");
          document.getElementById("language").innerHTML="";
          var id = $(".country-data-desktop-field :selected").data("mz-id");
            api
              .request("GET", "/api/platform/entitylists/siteurls@afg/entities/" + id,{pageSize:200})
              .then(function (res) {
                var languageValue = res.langOptions;
                var flagUrl = res.flagURL;
                document.getElementById("flag-image").src  = flagUrl;
                // document.getElementById("language").innerHTML =
                //   "<option  selected='selected' data-mz-url= 'https:" +
                //   languageValue[0].URL +
                //   "'>" +
                //   languageValue[0].Language +
                //   "</option>";
                var siteContext= HyprLiveContext.locals.siteContext.siteSubdirectory;
                languageValue.forEach(function (element, index) {
                  var langData = element.Language;
                  var langUrl = element.URL;
                  var langId ='/'+ element.langId.toLowerCase()+'-'+Hypr.getThemeSetting('countrySpecificCode').toLowerCase();
                  var select='';
                  if(siteContext == langId){
                    select="selected";
                  }
                  // if (index > 0) {
                    document.getElementById("language").innerHTML +=
                      "<option  class='mz-language-option'" + select +" data-mz-url= 'https:" +
                      langUrl +
                      "'>" +
                      langData +
                      "</option>";
                  // }
                  document.getElementById("langId").value = languageValue[0].URL;
                });
              });
          $(".mz-country-selector-popover-container .mz-close-icon").on(
            "click",
            function () {
              if(window.globalEventBus){
                  var eventData = {
                      'custom_event': 'country and language switcher',
                      'event_params':{
                        'event_act': 'close',
                        'event_lbl': 'close'
                      }
                    };
                  window.globalEventBus.emit('dataLayerEvent', eventData);
              }            
              $(".mz-country-selector-popover-container")
                .addClass("deactive")
                .removeClass("active");
              $(".mz-backdrop").addClass("deactive").removeClass("active");
              $(".mz-backdrop").removeProp("style");
              $('.mz-homepage').css('overflow', 'unset');
              if (mql.matches) {
                $(".mz-country-selector-popover-container").animate(
                  { right: "-100%" },
                  "slow"
                );
              } else if (mql2.matches) {
                $(".mz-country-selector-popover-container").animate(
                  { right: "-100%" },
                  "slow"
                );
              } else {
                $(".mz-country-selector-popover-container").animate(
                  { right: "-411px" },
                  "slow"
                );
              }
            }
          );
        });
      };
      var onCountrySelection = function () {
        $(".country-data-desktop-field").on("change", function (event) {
          $(".language-option").css("display", "none");
          var id = $(".country-data-desktop-field :selected").data("mz-id");
          api
            .request("GET", "/api/platform/entitylists/siteurls@afg/entities/" + id)
            .then(function (res) {
              var languageValue = res.langOptions;
              var flagUrl = res.flagURL;
              document.getElementById("flag-image").src  = flagUrl;
              document.getElementById("language").innerHTML =
                "<option  selected='selected' data-mz-url= 'https:" +
                languageValue[0].URL +
                "'>" +
                languageValue[0].Language +
                "</option>";
              languageValue.forEach(function (element, index) {
                var langData = element.Language;
                var langUrl = element.URL;
                if (index > 0) {
                  document.getElementById("language").innerHTML +=
                    "<option  class='mz-language-option' data-mz-url= 'https:" +
                    langUrl +
                    "'>" +
                    langData +
                    "</option>";
                }
                document.getElementById("langId").value = languageValue[0].URL;
              });           
            });
        });
      };
      var onLanguageSelection = function () {
        $(".language-data-desktop-field").on("change", function (event) {
          var option = $("option:selected", this).attr("data-mz-url");
          document.getElementById("langId").value = option;          
        });
      };
      var onMobileCountrySelection = function () {
        $(".country-data-field").on("change", function (event) {
          $(".language-option").css("display", "none");
          var id2 = $(".country-data-field :selected").data("mz-id");
          api
            .request(
              "GET",
              "/api/platform/entitylists/siteurls@afg/entities/" + id2
            )
            .then(function (res) {
              var languageValue1 = res.langOptions;
              var flagUrlM = res.flagURL;
              document.getElementById("flag-icon-mobile").src= flagUrlM;
              document.getElementById("languageId").innerHTML =
                "<option selected data-mz-site= 'https:" +
                languageValue1[0].URL +
                "'>" +
                languageValue1[0].Language +
                "</option>";
              languageValue1.forEach(function (element, index) {
                var langData1 = element.Language;
                var langUrl1 = element.URL;
                if (index > 0) {
                  document.getElementById("languageId").innerHTML +=
                    "<option class='mz-language-value' data-mz-site= 'https:" +
                    langUrl1 +
                    "'>" +
                    langData1 +
                    "</option>";
                }
                document.getElementById("langIdPhone").value = languageValue1[0].URL;
              });        
            });
        });
      };
      var onMobileLanguageSelection = function () {
        $(".language-data-field").on("change", function (event) {
          var option = $("option:selected", this).attr("data-mz-site");
          document.getElementById("langIdPhone").value = option;                   
        });
      };
      var siteChangeButton = function () {
        $(".desktop-btn-go-to-site").on("click", function () {
          if(window.globalEventBus){
            var eventData = {
                'custom_event': 'country and language switcher',
                'event_params':{
                'event_act': 'select country and language',
                'event_lbl': $("#country").val() + ":" + $("#language").val()
                }
              };
            window.globalEventBus.emit('dataLayerEvent', eventData);
          }            
          var countryValue = $(".country-data-desktop-field :selected").val();
          var langUrl = $(".language-option-hidden").val();
          var languageValue = $(".language-data-desktop-field :selected").val();
          var currentUrl = window.location.href;
          if (!_.isNull(countryValue) & !_.isNull(languageValue)) {
            if(currentUrl === langUrl || langUrl === ""){
              $('.mz-country-selector-popover-container').addClass('deactive').removeClass('active');
              $(".mz-backdrop").addClass("deactive").removeClass("active");
            }else{
              window.location.href = langUrl;
            }
          }
        });
      };
      var siteChangeMobileButton = function () {
        $(".button-go-to-site").on("click", function () {
          if(window.globalEventBus){
            var eventData = {
                'custom_event': 'country and language switcher',
                'event_params':{
                'event_act': 'select country and language',
                'event_lbl': $("#country").val() + ":" + $("#language").val()
                 }
              };
            window.globalEventBus.emit('dataLayerEvent', eventData);
          }     
          var countryValue1 = $(".country-data-field :selected").val();
          var urlData = $(".language-option-hidden-mobile").val();
          var languageValue1 = $(".language-data-field :selected").val();
          var currentUrl1 = window.location.href;
          if (!_.isNull(countryValue1) & !_.isNull(languageValue1)) {
            if(currentUrl1 === urlData || urlData === ""){
              $('.mz-menu-country-dropdown-selector').addClass('deactive').removeClass('is-active');
              $('.mz-hamburgmenu-option-container').css('display', 'none');
              $('.mz-backdrop').addClass('deactive').removeClass('active');
            }else{
              window.location.href = urlData;
            }
          }
        });
      };

      return {
        displayCountrySelector: displayCountrySelector,
        displayCountryDropdown: displayCountryDropdown,
        displayCountrySelectorPopup: displayCountrySelectorPopup,
        onCountrySelection: onCountrySelection,
        onLanguageSelection: onLanguageSelection,
        onMobileCountrySelection: onMobileCountrySelection,
        onMobileLanguageSelection: onMobileLanguageSelection,
        siteChangeButton: siteChangeButton,
        siteChangeMobileButton: siteChangeMobileButton 
      };
    
});