"use strict";

var app = app || {};

app.Game = Backbone.Model.extend({
    SIZE: 4,
    FOUR_FREQUENCY: 0.1, // Chance that a random tile dropped is "4", otherwise it's "2"
    MOVE_LEFT: 0,
    MOVE_RIGHT: 1,
    MOVE_UP: 2,
    MOVE_DOWN: 3,
    initialize: function() {
        this.grid = [];
        for (var x = 0; x < this.SIZE; x++) {
            var column = [];
            for (var y = 0; y < this.SIZE; y++) {
                column.push(0);
            }
            this.grid.push(column);
        }
    },
    addRandom: function() {
        var emptyTiles = [];
        // Gather ordered pairs [x,y] of empty tiles.
        for (var x = 0; x < this.SIZE; x++) {
            for (var y = 0; y < this.SIZE; y++) {
                if (this.grid[x][y] == 0) {
                    emptyTiles.push([x,y]);
                }
            }
        }
        if (emptyTiles.length == 0) {
            console.log('Error: Attempt to add tile to full board.');
            return;
        }
        var numberToAdd = (Math.random() < this.FOUR_FREQUENCY) ? 4 : 2;
        var xy = emptyTiles[_.random(0, emptyTiles.length-1)];
        this.grid[xy[0]][xy[1]] = numberToAdd;

        this.trigger('change');
    },
    possibleMoves: function() {
        // Returns an array of true or false for each possible move.
        var result = [false, false, false, false];
        // Check rows
        for (var y = 0; y < this.SIZE; y++) {
            for (var x = 0; x < this.SIZE-1; x++) {
                var left = this.grid[x][y], right = this.grid[x+1][y];
                if ((left == 0 && right > 0) || (left != 0 && left == right)) {
                    result[this.MOVE_LEFT] = true;
                }
                if ((left > 0 && right == 0) || (left != 0 && left == right)) {
                    result[this.MOVE_RIGHT] = true;
                }
            }
        }
        // Check columns
        for (var x = 0; x < this.SIZE; x++) {
            for (var y = 0; y < this.SIZE-1; y++) {
                var up = this.grid[x][y], down = this.grid[x][y+1];
                if ((up == 0 && down > 0) || (up != 0 && up == down)) {
                    result[this.MOVE_UP] = true;
                }
                if ((up > 0 && down == 0) || (up != 0 && up == down)) {
                    result[this.MOVE_DOWN] = true;
                }
            }
        }
        return result;
    },
    isGameOver: function() {
        var possible = this.possibleMoves();
        return !(possible[this.MOVE_LEFT] || possible[this.MOVE_RIGHT] ||
            possible[this.MOVE_UP] || possible[this.MOVE_DOWN]);
    },
    _isOnBoard: function(x, y) {
        return x >= 0 && x < this.SIZE && y >= 0 && y < this.SIZE;
    },
    _slide: function(startx, starty, deltax, deltay) {
        // The algorithm:
        // E.g. when moving left, start from the left. If the tile is not empty,
        // it will try to grab a tile with the same value, if possible. If it is
        // empty, it will grab and pull over any tile. Repeat.
        var moveMade = false;
        var x=startx, y=starty;
        while (this._isOnBoard(x,y)) {
            // We pull from the opposite direction that is sliding, hence the minus.
            var x2 = x - deltax;
            var y2 = y - deltay;
            while (this._isOnBoard(x2, y2)) {
                var curTile = this.grid[x][y];
                var otherTile = this.grid[x2][y2];

                if (otherTile == 0) {
                    x2 = x2 - deltax;
                    y2 = y2 - deltay;
                    continue; // Keep looking for the next non-0 tile.
                }
                // Here we know we have a non-zero tile to slide.
                if (curTile == 0) {
                    this.grid[x][y] = otherTile;
                    this.grid[x2][y2] = 0;
                    // If we're sliding to zero, we need to keep looking!
                    // E.g. [0, 2, 2, 0] case needs to collapse the 2s.
                    moveMade = true;
                    continue;
                }

                if (curTile == otherTile) {
                    // Slide it over and collapse the two values to 1.
                    this.grid[x][y] = curTile + otherTile;
                    this.grid[x2][y2] = 0;
                    moveMade = true;
                    break; // Proceed to the next tile
                } else {
                    // Also we're done when we hit a tile that doesn't match.
                    break;
                }
            }

            // Advance and do this pull again from the next tile.
            x -= deltax;
            y -= deltay;
        }

        return moveMade;
    },
    makeMove: function(move) {
        var startTiles = [];
        var deltax = 0, deltay = 0;
        if (move == this.MOVE_LEFT) {
            deltax = -1;
            for (var i=0; i < this.SIZE; i++) {
                startTiles.push([0, i]);
            }
        } else if (move == this.MOVE_RIGHT) {
            deltax = 1;
            for (var i=0; i < this.SIZE; i++) {
                startTiles.push([this.SIZE-1, i]);
            }
        } else if (move == this.MOVE_UP) {
            deltay = -1;
            for (var i=0; i < this.SIZE; i++) {
                startTiles.push([i, 0]);
            }
        } else if (move == this.MOVE_DOWN) {
            deltay = 1;
            for (var i=0; i < this.SIZE; i++) {
                startTiles.push([i, this.SIZE-1]);
            }
        } else {
            console.log("Error: Invalid move of %s", move);
            return false;
        }

        var madeMove = false;
        var self = this;
        // Actually make the moves now.
        _.each(startTiles, function(tile) {
            madeMove |= self._slide(tile[0], tile[1], deltax, deltay);
        });

        this.trigger('change');
        return madeMove;
    },
    getXY: function(x, y) {
        return this.grid[x][y];
    }
});

app.GameConsoleView = Backbone.View.extend({
    initialize: function() {
        this.listenTo(this.model, 'change', this.logGame);
        this.model.addRandom(); // Start the game!
    },
    move: function(direction) {
        var game = this.model;
        var moveMap = {
            'left': game.MOVE_LEFT,
            'right': game.MOVE_RIGHT,
            'up': game.MOVE_UP,
            'down': game.MOVE_DOWN
        };
        if (direction in moveMap) {
            var gameDir = moveMap[direction];
            var possible = game.possibleMoves();
            if (possible[gameDir]) {
                game.makeMove(gameDir);
                console.log('Adding a tile.');
                game.addRandom();
                if (game.isGameOver()) {
                    console.log("Game over.");
                }
            } else {
                console.log('Invalid move!');
            }
        }
    },
    logGame: function() {
        var padding = '      ';
        for (var y=0; y<this.model.SIZE; y++) {
            var cellStrings = [];
            for (var x=0; x<this.model.SIZE; x++) {
                var cellValue = this.model.getXY(x, y);
                if(cellValue == 0) {
                    cellStrings.push(padding);
                } else {
                    cellStrings.push((padding + cellValue).slice(-6));
                }
            }

            console.log(cellStrings.join(' | '));
        }
    }
});

app.GameView = Backbone.View.extend({
    TILE_SIZE: 70,
    TILE_OFFSET: 11,

    el: $(document), // The whole document, to manage keyboard events
    events: {
        "keydown": "keyPressed"
    },
    template: _.template($('#game-board-template').html()),
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        this.model.addRandom();
    },
    _positionForTile: function(x, y) {
        var xpos = this.TILE_OFFSET + this.TILE_SIZE * x;
        var ypos = this.TILE_OFFSET + this.TILE_SIZE * y;
        return [xpos, ypos];
    },
    render: function() {
        this.$('#board').html(this.template({boardSize: this.model.SIZE}));
        for(var y=0; y < this.model.SIZE; y++) {
            for(var x=0; x < this.model.SIZE; x++) {
                var tileValue = this.model.getXY(x, y);
                if (tileValue > 0) {
                    var html = '<div class="board-tile">' + tileValue + '</div>';
                    var pos = this._positionForTile(x, y);
                    var $tile = $(html).css(
                        {top: pos[1] + "px", left: pos[0] + "px"});
                    this.$('.board-outer').append($tile);
                }
            }
        }
    },
    keyPressed: function(e) {
        var game = this.model;
        var keyMap = {
            37: game.MOVE_LEFT,
            38: game.MOVE_UP,
            39: game.MOVE_RIGHT,
            40: game.MOVE_DOWN
        }
        var code = e.keyCode;
        if (code in keyMap) {
            var gameDir = keyMap[code];
            var possible = game.possibleMoves();
            if (possible[gameDir]) {
                game.makeMove(gameDir);
                game.addRandom();
                if (game.isGameOver()) {
                    console.log("Game over.");
                    this.$('#board').append('Game Over.');
                }
            }
        }
    }
});
var view = new app.GameView({model: new app.Game()});