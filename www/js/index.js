(function($){
    var canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var screenMultX = canvas.width / 800;
    var screenMultY = canvas.height / 480;
    var ctx = canvas.getContext("2d");
    ctx.font = "15pt Arial";
    var player = {};
    var enemies = [];
    var items = [];
    var score,play,difficulty;
    var paused = false;
    var sound = true;
    var debug = false;
    var volume = 1;
    var scoreBoard = {
        posX        : canvas.width - 150,
        posY        : 0,
        width       : 150,
        height      : 30,
        widthM      : 150,
        heightM     : 30
    };
    
    var requestAnimFrame = (function(){
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame     ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback, element){
                    window.setTimeout(callback, 1000 / 15);
                };
    })();

    var assetLoader = (function(){
        

        //image dictionary
        this.imgs = {
            'clouds'        : 'img/combined_sky.jpg',
            'player'        : 'img/player.png',
            'pterodactyl'   : 'img/enemy_pterodactyl.png',
            'tien'          : 'img/enemy_tien.png',
            'piccolo'       : 'img/enemy_piccolo.png',
            'missile'       : 'img/enemy_missile.png'
        };

        //sound dictionary
        this.sounds = {
            'music'         : 'res/raw/music.mp3',
            'start'         : 'res/raw/kintoun.wav',
            'gameover'      : 'res/raw/hit3.wav'
        };

            var src;
            var assetsLoaded = 0;
            var assetsTotal = Object.keys(this.imgs).length + Object.keys(this.sounds).length;

            function loaded() {
                assetsLoaded++;
            }
        

            
            //load images
            for(var img in this.imgs){
                if(this.imgs.hasOwnProperty(img)){
                    src = this.imgs[img];
                    this.imgs[img] = new Image();
                     this.imgs[img].name = img;
                    this.imgs[img].onload = function(){ loaded(); };
                    this.imgs[img].src = src;
                }
            }

            //load sounds
            for(var sound in this.sounds){
                if(this.sounds.hasOwnProperty(sound)){
                    src = this.sounds[sound];
                    this.sounds[sound] = new Media(src);
                    if(this.sound[sound] == null){
                        this.sounds[sound] = new Audio();
                        this.sounds[sound].src =  src;
                    }
                    this.sounds[sound].volume = volume;
                    loaded(); 
                }
            }
        

        return{
            imgs:           this.imgs,
            sounds:         this.sounds,
            totalAssets:    this.totalAssets,
        };
    })();


    var background = (function(){
        var cloud = {};

        this.draw = function(){
            cloud.x -= cloud.speed;
            ctx.drawImage(assetLoader.imgs.clouds, cloud.x, cloud.y,canvas.width,canvas.height);
           // ctx.drawImage(cloudsImg, clouds.x + canvas.width, clouds.y,
           //             canvas.width,canvas.height);

           //reset when scrolled
           // if(clouds.x + assetLoader.imgs.clouds.width <= 0){
           //     clouds.x = 0;
           // }
        };

        this.reset = function(){
            cloud.x = 0;
            cloud.y = 0;
            cloud.speed = 0;
        };
        
        /*
        This method fills the background in the area the old sprite
        image existed. The checks are to avoid drawing beyond the 
        boundaries of the canvas
        */
        this.fillHole = function(sprite){
            if( sprite.posX < canvas.width && (sprite.posX + sprite.widthM) > 0){
                var x = (sprite.posX <= 0) ? 0 :
                         sprite.posX / screenMultX;

                var w = (sprite.width + x > assetLoader.imgs.clouds.width) ? 
                             assetLoader.imgs.clouds.width - x : (sprite.posX < 0) ? 
                             sprite.posX / screenMultX + sprite.width :
                             sprite.width;

                ctx.drawImage(  assetLoader.imgs.clouds,
                                x, 
                                sprite.posY / screenMultY,
                                w,
                                sprite.height,
                                sprite.posX,
                                sprite.posY,
                                sprite.widthM,
                                sprite.heightM
                             );
}
            
        };

        return {
            draw: this.draw,
            reset: this.reset,
            fillHole: this.fillHole
        };
    })();

    function SpriteSheet(sheetImage, frameWidth, frameHeight){
        this.image = sheetImage;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.framesPerRow = Math.floor(this.image.width / this.frameWidth);
    }

    function Animation(spritesheet, frameSpeed, startFrame, endFrame){
        var animationSequence = [];
        var currentFrame = 0;
        var counter = 0;
        
        for(var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++){
            animationSequence.push(frameNumber);
        }

        this.update = function(){
            if(counter == (frameSpeed - 1)){
                currentFrame = (currentFrame + 1) % animationSequence.length;
            }

            counter = (counter + 1) % frameSpeed;
        };

        this.draw = function(x,y){
            //var 
            var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
            var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);
            
            ctx.drawImage(
                spritesheet.image,
                col * spritesheet.frameWidth,
                row * spritesheet.frameHeight,
                spritesheet.frameWidth,
                spritesheet.frameHeight,
                x,y,
                spritesheet.frameWidth * screenMultX,
                spritesheet.frameHeight * screenMultY
            );

            //Draws Bounded Boxes for debugging
            if(debug){
                ctx.rect(x,y,spritesheet.frameWidth * screenMultX,
                            spritesheet.frameHeight * screenMultY);
                ctx.stroke();
            }
        };
    }

    function enemy(y, type){
        var e = this;
        e.posX = canvas.width + 100 * screenMultX;
        e.posY      = y;
        e.dX        = 0;
        e.dY        = 0;
        e.moves     = 0;

        switch(type){
            case "pterodactyl":
                e.width  = 100;
                e.height = 81;
                e.speed  = 2 + difficulty;
                e.sheet  = new SpriteSheet(
                    assetLoader.imgs.pterodactyl, 
                    e.width,
                    e.height
                );
                e.anim   = new Animation(e.sheet, 10, 0, 5);
                break;
            case "piccolo":
                e.width  = 39;
                e.height = 76;
                e.speed  = 3 + difficulty;
                e.sheet  = new SpriteSheet(
                    assetLoader.imgs.piccolo, 
                    e.width,
                    e.height
                );
                e.anim   = new Animation(e.sheet, 25, 0, 1);
                break;
            case "tien":
                e.width  = 50;
                e.height = 60;
                e.speed  = 3 + difficulty;
                e.sheet  = new SpriteSheet(
                    assetLoader.imgs.tien, 
                    e.width,
                    e.height
                );
                e.anim   = new Animation(e.sheet, 10, 0, 6);
                break;
            case "missile":
                e.width  = 75;
                e.height = 30;
                e.speed  = 5 + difficulty;
                e.sheet  = new SpriteSheet(
                    assetLoader.imgs.missile, 
                    e.width,
                    e.height
                );
                e.anim   = new Animation(e.sheet, 20, 0, 1);
                break;
        }

        //scales size
        e.widthM  = e.width * screenMultX;
        e.heightM = e.height * screenMultY;

        //catches spawning below screen
        if(e.posY + e.heightM + screenMultY > canvas.height){
            e.posY = canvas.height - e.heightM - screenMultY;
        }

        calculateMovement(e, (-e.widthM - 5), e.posY);

        return e;
    }

    function createPlayer(){
        // setup the player
        player.width   = 45;
        player.widthM  = player.width * screenMultX;
        player.height  = 54;
        player.heightM = player.height * screenMultY;
        player.speed   = 4;
        player.posX    = 60;
        player.posY    = 250;
        player.dX      = 0;
        player.dY      = 0;
        player.moves   = 0;
        player.sheet   = new SpriteSheet(assetLoader.imgs.player, player.width, player.height);
        player.anim    = new Animation(player.sheet, 10, 0, 2);
        updatePlayer();
    }

    function updatePlayer(){
        player.anim.update();

        if(player.moves > 0){
            player.posX = (player.posX + player.dX < 1) ? 1 : player.posX + player.dX;
            player.posY = (player.posY + player.dY < 1) ? 1 : 
                          (player.posY + player.dY + player.heightM > canvas.height) ?
                               canvas.height - player.heightM - 1 : player.posY + player.dY;
            player.moves--;
        } 
        player.anim.draw(
            //keeps player within canvas x
            (player.posX < (canvas.width  - player.widthM)  && player.posX > 0) ? 
                player.posX : (player.posX < 0) ? 
                              0 : (canvas.width - player.widthM), 
            //keeps player within canvas y
            (player.posY < (canvas.height - player.heightM) && player.posY > 0) ?
                player.posY : (player.posY < 0) ?
                              0 : (canvas.height - player.heightM)
        );
        

    }

    function addEnemy(){
        var randEnemy = rand(0,10);
        var type;
        switch(randEnemy){
            case 0:
                type = "piccolo";
                break;
            case 1:
                type = "tien";
                break;
            default:
                type = (Math.random() > 0.5) ? "pterodactyl" : "missile";
        }

        enemies.push( new enemy(
            rand(0,canvas.height),
            type
        ));
    }

    function updateEnemies(){
        for(var i in enemies){
            enemies[i].anim.update();
            if(enemies[i].moves > 0){
                enemies[i].posX += enemies[i].dX;
                enemies[i].moves--;
                enemies[i].anim.draw(
                        enemies[i].posX, 
                        //keeps player within canvas y
                        (enemies[i].posY < (canvas.height - enemies[i].heightM) && enemies[i].posY > 0) ?
                        enemies[i].posY : (enemies[i].posY < 0) ?
                                      0 : (canvas.height - enemies[i].heightM)
                                    );
                collisionCheck(enemies[i]);
            }else{
                enemies.splice(i,1);
            }
        }
    }

    function clearSpriteArea(){
        background.fillHole(player);
        background.fillHole(scoreBoard);

        for(var i in enemies){
            var e = enemies[i];
            background.fillHole(e);
        }
    }

    function calculateMovement(sprite,destX,destY){
        var p1 = { x: destX, y: destY };
        var p2 = { x: sprite.posX, y: sprite.posY };
        var dx = p1.x - p2.x;
        var dy = p1.y - p2.y;
        var distance = Math.sqrt(dx*dx + dy*dy);
        
        sprite.moves = distance / sprite.speed;
        sprite.dX = dx / sprite.moves || 0;
        sprite.dY = dy / sprite.moves || 0;        

    }

    function collisionCheck(enemy){
        var PRC_1 = 0.3;       //Percent to round the corners on collision
        var PRC_2 = 1 - PRC_1;  //Secondary calc
        var SD    = -1;         //Standard Deviation try to smooth out errors

        if( 
            ((
             (player.posX + player.widthM  * PRC_2) > (enemy.posX + enemy.widthM  * PRC_1) &&
             (player.posX + player.widthM  * PRC_1) < (enemy.posX + enemy.widthM  * PRC_2)
            )&&(
             (player.posY + player.heightM) > enemy.posY && 
              player.posY < (enemy.posY + enemy.heightM)
            ))||((
             (player.posY + player.heightM * PRC_1) < (enemy.posY + enemy.heightM * PRC_2) &&
             (player.posY + player.heightM * PRC_2) > (enemy.posY + enemy.heightM * PRC_1)
            )&&(
             (player.posX + player.widthM) > enemy.posX &&
              player.posX < (enemy.posX + enemy.widthM)
            ))
        ){
            gameOver();
        }
    }

    function rand(low, high){
        return Math.floor(Math.random() * (high - low + 1) + low);
    }

    function startGame() {
        createPlayer();
        background.reset();
        play = true;
        score = 0;
        difficulty = 0;
        enemies = [];
        assetLoader.sounds.start.play();
        assetLoader.sounds.music.play();
        background.draw();
        animate();
    }

    function gameOver(){
        assetLoader.sounds.music.pause();
        assetLoader.sounds.gameover.play();

        $("#score").html(score);
        $("#restart").show();
        play = false;

    }

    /// Game loop
    function animate() {
        if(play){
            requestAnimFrame( animate );
            clearSpriteArea();
            if(debug){ ctx.beginPath(); }
            //background.draw();

            score++;
            ctx.fillText("Score: " + score,canvas.width-150,30);
            
            if(score % 1000 == 0 && difficulty < 5) difficulty++;
       
            //Update chars/sprites
            updatePlayer();
            updateEnemies(); 

            //Adds enemies
            if(score % (60 - (8*difficulty)) == 1){ 
                addEnemy();
            }
        }
    }

    canvas.onmousedown = function(e){
        calculateMovement(
            player, 
            e.pageX - (player.widthM  / 2), 
            e.pageY - (player.heightM / 2)
        );
    }

    $("#btnStart").click(function(){
        $("#start").hide();
        startGame();
    });

    $("#btnRestart").click(function(){
        $("#restart").hide();
        startGame();
    });

    $(".btnExit").click(function(){
        navigator.app.exitApp();
    });

    $(".sound").click(function(){
        var $this = $(this);
        if($this.hasClass('sound-on')){
            $this.removeClass('sound-on');
            $this.addClass('sound-off');
            volume = 0;
        }else{
            $this.removeClass('sound-off');
            $this.addClass('sound-on');
            volume = 1;
        }

        for(var sound in assetLoader.sounds){
            if(assetLoader.sounds.hasOwnProperty(sound)){
                assetLoader.sounds[sound].volume = volume;
            }
        }
    });

}(jQuery));

