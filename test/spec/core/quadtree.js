describe("iD.Quadtree", function() {
    var connection = {},
        Quadtree   = iD.Quadtree(connection).densityThreshold(2);

    function fail() {
        throw new Error("failed");
    }

    describe("#contains", function() {
        it("returns true if the node contains the given point", function() {
            expect(Quadtree(0, 0, 1).contains([-10, 10])).to.equal(true);
        });

        it("returns false if the node does not contain the given point", function() {
            expect(Quadtree(0, 0, 1).contains([10, -10])).to.equal(false);
        });
    });

    describe("#load", function() {
        it("loads a data tile at the desired depth and calls the dense callback if it's dense", function(done) {
            var q = Quadtree(0, 0, 0);

            connection.loadExtent = function(extent, cb) {
                expect(extent).to.eql(q.extent());
                cb(null, {length: 3});
            };

            q.load(q.extent(), 0, done, fail);
        });

        it("loads a data tile at the desired depth and calls the sparse callback if it's sparse", function(done) {
            var q = Quadtree(0, 0, 0);

            connection.loadExtent = function(extent, cb) {
                expect(extent).to.eql(q.extent());
                cb(null, {length: 1});
            };

            q.load(q.extent(), 0, fail, done);
        });

        it("recurses (dense case)", function() {
            var q = Quadtree(0, 0, 0),
                extents = [];

            connection.loadExtent = function(extent, cb) {
                extents.push(extent);
                cb(null, {length: 3});
            };

            q.load(q.extent(), 1);

            expect(extents).to.eql([
                q.se.extent(),
                q.nw.extent(),
                q.ne.extent(),
                q.sw.extent()
            ]);
        });

        it("recurses (sparse case)", function() {
            var q = Quadtree(0, 0, 0),
                extents = [];

            connection.loadExtent = function(extent, cb) {
                extents.push(extent);
                cb(null, {length: 1});
            };

            q.load(q.extent(), 1);

            expect(extents).to.eql([
                q.se.extent(),
                q.extent()
            ]);
        });

        it("recurses (mix of sparse and dense)", function() {
            // Scenario:
            //
            //  +--+--+-----+
            //  |  |  |     |
            //  +--+--+     |
            //  |  |dd|     |
            //  +--+--+--+--+
            //  |     |dd|  |
            //  |     +--+--+
            //  |     |  |  |
            //  +-----+--+--+
            //
            // Whe nodes marked 'd' are determined to be dense and
            // all others are sparse.

            var q = Quadtree(0, 0, 0),
                extents = [];

            connection.loadExtent = function(extent, cb) {
                extents.push(extent);
                cb(null, {length:
                    (q.nw && q.nw.se && extent.equals(q.nw.se.extent())) ||
                    (q.se && q.se.nw && extent.equals(q.se.nw.extent())) ? 3 : 1});
            };

            q.load(q.extent(), 2);

            expect(extents).to.eql([
                q.se.nw.extent(),
                q.se.ne.extent(),
                q.se.sw.extent(),
                q.se.se.extent(),

                q.nw.se.extent(),
                q.nw.nw.extent(),
                q.nw.ne.extent(),
                q.nw.sw.extent(),

                q.ne.se.extent(),
                q.ne.extent(),

                q.sw.ne.extent(),
                q.sw.extent()
            ]);
        });
    });

    describe("#zoom", function() {
        it("returns 16 for unloaded tiles", function() {
            var q = Quadtree(0, 0, 0);
            expect(q.zoom(q.extent())).to.equal(16);
        });

        it("returns 0 for tiles which don't intersect the extent", function() {
            var q1 = Quadtree(0, 0, 1),
                q2 = Quadtree(10, 10, 2);
            expect(q1.zoom(q2.extent())).to.equal(0);
        });

        it("returns the maximum of child zooms", function() {
            var q = Quadtree(0, 0, 0);

            q.split();
            q.ne.data = q.sw.data = q.se.data = {};

            q.nw.split();
            q.nw.nw.data = q.nw.ne.data = q.nw.sw.data = q.nw.se.data = {};

            expect(q.zoom(q.extent())).to.equal(2);
        });
    });
});