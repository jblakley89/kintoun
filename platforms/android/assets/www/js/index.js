(function(){
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    var player = {};
    
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
            'bg'        : 'img/static_sky_1.png',
            'clouds'    : 'img/cloud_medley_1.png'
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
        startGame();
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
        };
    }

    function startGame() {
        // setup the player
        player.width  = 60;
        player.height = 60;
        player.speed = 6;
        player.posX   = 60;
        player.posY   = 250;
        player.dX     = 0;
        player.dY     = 0;
        player.moves  = 0;
        player.sheet  = new SpriteSheet("img/kinto_un_2.png", player.width, player.height);
        player.anim   = new Animation(player.sheet, 10, 0, 2);
        background.reset();
        animate();
    }

    /**
     * Game loop
     */
    function animate() {
        requestAnimFrame( animate );
        background.draw();
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

    canvas.onclick = function(e){
        var p1 = { x: (e.pageX - (player.width/2)), y: (e.pageY - (player.height/2)) };
        var p2 = { x: player.posX, y: player.posY };
        var dx = p1.x - p2.x;
        var dy = p1.y - p2.y;
        var distance = Math.sqrt(dx*dx + dy*dy);
        
        player.moves = distance / player.speed;
        player.dX = (p1.x - p2.x)/player.moves;
        player.dY = (p1.y - p2.y)/player.moves;        
    }

    assetLoader.downloadAll();

})();

