(function($){
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = "15pt Arial";
    var player = {};
    var enemies = [];
    var items = [];
    var score = 0;
    var paused = false;
    var play = true;
    var sound = true;
    var difficulty = 0;
    
    var requestAnimFrame = (function(){
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame     ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback, element){
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    var assetLoader = (function(){
        
        //image dictionary
        this.imgs = {
            'bg'            : 'img/static_sky_1.png',
            'clouds'        : 'img/combined_sky.jpg',
            'ePterodactyl'  : 'img/enemy_pterodactyl.png',
        };

        var assetsLoaded = 0;
        var numImgs = Object.keys(this.imgs).length;
        this.totalAssets = numImgs;

        function assetLoaded(dic, name){
            if(this[dic][name].status !== "loading"){
                return;
            }
            this[dic][name].status = "loaded";
            assetsLoaded++;

            if(assetsLoaded === this.totalAssets && typeof this.finished === "function"){
                this.finished();
            }
        }

        this.downloadAll = function(){
            var _this = this;
            var src;
            
            //load images
            for(var img in this.imgs){
                if(this.imgs.hasOwnProperty(img)){
                    src = this.imgs[img];
                    
                    //closure event
                    (function(_this,img){
                        _this.imgs[img] = new Image();
                        _this.imgs[img].status = "loading";
                        _this.imgs[img].name = img;
                        _this.imgs[img].onload = function(){ assetLoaded.call(_this,'imgs',img); };
                        _this.imgs[img].src = src;
                    })(_this,img);
                }
            }
        };

        return{
            imgs:           this.imgs,
            totalAssets:    this.totalAssets,
            downloadAll:    this.downloadAll
        };
    })();

    assetLoader.finished = function(){
        //startGame();
        background.reset();
    };

    var background = (function(){
        var clouds = {};

        this.draw = function(){
            ctx.drawImage(assetLoader.imgs.bg,0,0);
            
            //pan background
            clouds.x -= clouds.speed;
            
            //draw images in loop
            ctx.drawImage(assetLoader.imgs.clouds, clouds.x, clouds.y);
            ctx.drawImage(assetLoader.imgs.clouds, clouds.x + canvas.width, clouds.y);

            //reset when scrolled
            if(clouds.x + assetLoader.imgs.clouds.width <= 0){
                clouds.x = 0;
            }
        };

        this.reset = function(){
            clouds.x = 0;
            clouds.y = 0;
            clouds.speed = 0.2
        };

        return {
            draw: this.draw,
            reset: this.reset
        };
    })();

    function SpriteSheet(path, frameWidth, frameHeight){
        this.image = new Image();
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        var self = this;
        this.image.onload = function(){
            self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
        };
        this.image.src = path;
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
            var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
            var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

            ctx.drawImage(
                spritesheet.image,
                col * spritesheet.frameWidth,
                row * spritesheet.frameHeight,
                spritesheet.frameWidth,
                spritesheet.frameHeight,
                x,y,
                spritesheet.frameWidth,
                spritesheet.frameHeight
            );

            //Draws Bounded Boxes for debugging
            //ctx.rect(x,y,spritesheet.frameWidth,spritesheet.frameHeight);
            //ctx.stroke();
        };
    }

    function enemy(y, type){
        var e = this;
        e.posX = canvas.width + 90;
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
                    "img/enemy_pterodactyl_3.png", 
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
                    "img/enemy_piccolo.png", 
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
                    "img/enemy_tien_2.png", 
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
                    "img/enemy_missile_2.png", 
                    e.width,
                    e.height
                );
                e.anim   = new Animation(e.sheet, 20, 0, 1);
                break;
        }

        //catches spawning below screen
        if(e.posY > (canvas.height - e.height)){
            e.posY = canvas.height - e.height;
        }

        calculateMovement(e, (-e.width - 5), e.posY);

        return e;
    }

    function createPlayer(){
        // setup the player
        player.width  = 45;
        player.height = 54;
        player.speed = 4;
        player.posX   = 60;
        player.posY   = 250;
        player.dX     = 0;
        player.dY     = 0;
        player.moves  = 0;
        player.sheet  = new SpriteSheet("img/kinto_un_3.png", player.width, player.height);
        player.anim   = new Animation(player.sheet, 10, 0, 2);

    }

    function updatePlayer(){
        player.anim.update();

        if(player.moves > 0){
            player.posX += player.dX;
            player.posY += player.dY;
            player.moves--;
        }

        player.anim.draw(
            (player.posX < (canvas.width - player.width)) ? 
                player.posX : (canvas.width - player.width), 
            (player.posY < (canvas.height - player.height)) ?
                player.posY : (canvas.height - player.height)
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
                enemies[i].posY += enemies[i].dY;
                enemies[i].moves--;
                enemies[i].anim.draw(enemies[i].posX, enemies[i].posY);
                collisionCheck(enemies[i]);
            }else{
                enemies.splice(i,1);
            }
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
        //if( 
        //    player.posX < (enemy.posX + enemy.width)       && 
        //    (player.posX + player.width) > enemy.posX      &&
        //    player.posY < (enemy.posY + enemy.height)      &&
        //    (player.posY + player.height) > enemy.posY
        //){ }

        var PRC_1 = 0.3;       //Percent to round the corners on collision
        var PRC_2 = 1 - PRC_1;  //Secondary calc
        var SD    = -1;         //Standard Deviation try to smooth out errors

        if( 
            ((
             (player.posX + player.width  * PRC_2) > (enemy.posX + enemy.width  * PRC_1) &&
             (player.posX + player.width  * PRC_1) < (enemy.posX + enemy.width  * PRC_2)
            )&&(
             (player.posY + player.height) > enemy.posY && 
              player.posY < (enemy.posY + enemy.height)
            ))||((
             (player.posY + player.height * PRC_1) < (enemy.posY + enemy.height * PRC_2) &&
             (player.posY + player.height * PRC_2) > (enemy.posY + enemy.height * PRC_1)
            )&&(
             (player.posX + player.width) > enemy.posX &&
              player.posX < (enemy.posX + enemy.width)
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

        if(sound){
            document.getElementById("sound_start").play();
//            document.getElementById("sound_music").load();
            document.getElementById("sound_music").play();
        }

        animate();
    }

    function gameOver(){
        if(sound){
            document.getElementById("sound_gameover").play();
            document.getElementById("sound_music").pause();
        }
        $("#score").html(score);
        $("#restart").show();
        play = false;

    }

    /// Game loop
    function animate() {
        if(play){
            requestAnimFrame( animate );
            ctx.clearRect(0,0,canvas.width, canvas.height);
            ctx.beginPath();
            background.draw();

            score++;
            ctx.fillText("Score: " + score,canvas.width-150,30);
            
            if(score % 1000 == 0 && difficulty < 5) difficulty++;
       
            //Update chars/sprites
            updatePlayer();
            updateEnemies(); 

            //Adds enemies
            if(score % (60 - (8*difficulty)) == 1){ //TODO make scale with score
                addEnemy();
            }
        }
    }

    canvas.onclick = function(e){
        calculateMovement(
            player, 
            e.pageX - (player.width/2), 
            e.pageY - (player.height/2)
        );
    }

    assetLoader.downloadAll();
    
    $("#btnStart").click(function(){
        $("#start").hide();
        startGame();
    });

    $("#btnRestart").click(function(){
        $("#restart").hide();
        startGame();
    });

}(jQuery));

