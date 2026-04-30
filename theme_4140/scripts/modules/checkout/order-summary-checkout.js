require(["modules/jquery-mozu"], function ($) {
    $(document).ready(function() {
        if ($(window).width() < 1001) {
            $(document).on("click",".mz-ordersummary-checkout-v2 .mz-ordersummary-checkout-header",function(){
                $(".mz-checkoutform  #checkout-rightcol").toggleClass('mz-open-modal-bg');
                $("body.mz-checkout").toggleClass('mz-open-modal-bg-body');
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-checkout-headerrow").toggleClass('mz-open-headerrow');
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-checkout-itemtotalprice").toggleClass('mz-up-arrow');
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-lineitems").toggleClass('mz-open-body');
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-lineitems").toggle();
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-calc").toggleClass('mz-open-body');
                $(".mz-ordersummary-checkout-v2 .mz-ordersummary-calc").toggle();
                $(".mz-checkoutform #coupon-code-field").parent().toggle();
            });
            
            //Added code when we click out side the popUp on checkout
            // Function to close the modal and reset classes and styles
            function closeModalCheckoutPageN() {
                $('.mz-l-column').removeClass('mz-open-modal-bg');
                $('body').removeClass('mz-open-modal-bg-body');
                $('.mz-up-arrow').removeClass('mz-up-arrow');
                $('.mz-ordersummary-lineitems').removeClass('mz-open-body').css('display', 'flex');
                $('.mz-ordersummary-calc').removeClass('mz-open-body').css('display', 'block');
                $('.mz-checkoutform-ordersummary + .mz-l-formfieldgroup').css('display', 'none');
                $('.overlay-checkout-page').hide(); // Hide the overlay
            }
       
            // Show the overlay when the modal is open
            function openModalCheckoutPageN() {
                $('.overlay-checkout-page').show();
            }
            $(document).on("click",".mz-ordersummary-checkout-v2 .mz-ordersummary-checkout-header",function(){
                openModalCheckoutPageN();
            });
        
            // Event listener for clicks outside the modal or on the overlay to close the modal
            $(document).on('click', function(event) {
                if (!$(event.target).closest('.mz-l-column.mz-open-modal-bg').length) {
                    closeModalCheckoutPageN();
                }
            });
        
            // Prevent clicks inside the modal from closing it
            $('.mz-l-column.mz-open-modal-bg').on('click', function(event) {
                event.stopPropagation();
            });
        
            // Event listener for clicks on the overlay
            $('.overlay-checkout-page').on('click', function(event) {
                closeModalCheckoutPageN();
            });
        //Added code when we click out side the popUp on checkout

        }
        
        setTimeout(function () {
        $('#mz-total-saving-checkout').attr('onclick','toggleCheckout()');
        // $(".mz-checkout .mz-ordersummary-calc #mz-total-saving-checkout").click(function(){
        //     $(this).toggleClass('mz-collapse-active');
        //     $(".mz-checkout .mz-ordersummary-calc #mz-total-saving-value-checkout").toggle();
        // });
        var totalQtyItems = 0;
        $('.mz-ordersummary-checkout-v2 .mz-ordersummary-lineitems .mz-ordersummary-line-item').each(function(){
            var itemQty = $(this).find('.mz-ordersummary-item-product-details .mz-ordersummary-item-qty').text().replace('Qty: ', '');

            totalQtyItems += parseInt(itemQty);
        });
        $('.mz-ordersummary-checkout-v2 #itemQtyCountOS').text(totalQtyItems);
        }, 2500); 
    });
});
function toggleCheckout() {
    var x = document.getElementById("mz-total-saving-value-checkout");
    var y = document.getElementById("mz-total-saving-checkout");
    if (x.style.display === "none") {
      x.style.display = "block";
      y.classList.add("mz-collapse-active");
    } else {
      x.style.display = "none";
      y.classList.remove("mz-collapse-active");
    }
}