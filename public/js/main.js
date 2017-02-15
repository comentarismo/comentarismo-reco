var curr_userId = 0;
$('.error').hide();
$('.success').hide();

function selectUser(userId){
    curr_userId = userId;
    loadRecs(userId);

    $(".user").removeClass("selected");
    $("#u_"+userId).addClass("selected");

    getLikes();
}

function likeItem(itemId){
    var userId = curr_userId;

    // send off the like request
    $.ajax({
        url:"/users/"+userId+"/like/"+itemId,
        type: "GET",
        success: function(data){
            $(".item#i_"+itemId).addClass("selected");
            $(".item#r_"+itemId).addClass("selected");

            console.log(data);
            $('.error').hide();

            $('.success').html("OK: likeItem "+ JSON.stringify(data))
            $('.success').show();

        }, error: function (error) {
            console.log("Error:, likeItem, ",error);
            $('.success').hide();
            $('.error').html("Error:, likeItem, "+ JSON.stringify(error))
            $('.error').show()
        },
        dataType: "json",
    });
}

function loadRecs(userId){

    // request recommendations
    $.ajax({

        url:"/users/"+userId+"/recommend",
        type: "GET",
        success: function(data){
            // add them to ui
            var recs = data.recommendations
            console.log("/users/"+userId+"/recommend", JSON.stringify(recs));
            $('.error').hide();
            $('.success').html("OK: loadRecs "+ userId);
            $('.success').show();

            $.ajax({
                url: "/users/" + curr_userId + "/likes",
                success: function (data) {
                    $('.error').hide();
                    $('.success').html("OK: getLikes " + curr_userId)
                    $('.success').show();

                    var html = "<ul>";
                    var list = "";
                    for (var i = 0; i < recs.length; i++) {
                        var t = recs[i];
                        console.log(t);
                        if (t)
                            list = list + "<li id='r_"+ t._id +"' class='item'>" + t.thing + "<a href='#' class='btn' onclick=likeItem('" + t._id + "')> like</a></li>"
                    }
                    html = html + list + "</ul>";

                    $("#recList").html(html);

                    for (i in data) {
                        $(".item#r_" + data[i].itemId).addClass("hidden");
                    }


                }, error: function (error) {
                    console.log("Error:, getLikes, ", error);
                    $('.success').hide();
                    $('.error').html("Error:, getLikes, " + JSON.stringify(error))
                    $('.error').show();
                },
            })



        }, error: function (error) {
            console.log("Error:, loadRecs, ", error);
            $('.success').hide();
            $('.error').html("Error:, loadRecs, "+ JSON.stringify(error));
            $('.error').show();
        },
        dataType: "json",
    });
}

function addUser(){
    var name = $(".newUserName").val();

    $.ajax({
        url:"/users/add",
        data: {
            name: name
        },
        success:function(data){
            window.location.reload();
            $('.error').hide();
            $('.success').html("OK: addUser "+ name);
            $('.success').show();

        }, error: function (error) {
            console.log("Error:, addUser, ", error);
            $('.success').hide();
            $('.error').html("Error:, addUser, "+ JSON.stringify(error))
            $('.error').show()
        },
    });
}

function addItem() {
    var thing = $(".newThing").val();
    $.ajax({
        url: "/items/add",
        data: {
            thing:thing
        },
        success: function (data) {
            window.location.reload();
            $('.error').hide();
            $('.success').html("OK: addItem "+thing);
            $('.success').show();

        }, error: function (error) {
            console.log("Error:, addItem, ", error);
            $('.success').hide();
            $('.error').html("Error:, addItem, "+ JSON.stringify(error));
            $('.error').show();
        },
    });
}

function getLikes(){

    $.ajax({
        url: "/users/"+curr_userId+"/likes",
        success: function(data){
            $(".item ").removeClass("selected");
            $("#recList").html('');
            $('.error').hide();
            $('.success').html("OK: getLikes "+ curr_userId);
            $('.success').show();

            for(i in data){
                $(".item#i_"+data[i].itemId).addClass("selected");
            }
        }, error: function (error) {
            console.log("Error:, getLikes, ", error);
            $('.success').hide();
            $('.error').html("Error:, getLikes, "+ JSON.stringify(error));
            $('.error').show();
        },
    })
}