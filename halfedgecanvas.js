DRAW_OFFSET = 1.001; // Draw points at a slight multiplicative offset for debugging
LINE_WIDTH = 4;

class HalfEdgeCanvas extends BaseCanvas {
    /**
     * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     * @param {DOM Element} meshViewer Handle to div where mesh viewer is being displayed
     * @param {antialias} boolean Whether antialiasing is enabled (true by default)
     */
    constructor(glcanvas, meshViewer, shadersrelpath, antialias) {
        super(glcanvas, shadersrelpath, antialias);
        this.meshViewer = meshViewer;
        glcanvas.addEventListener("contextmenu", function(e){ e.stopPropagation(); e.preventDefault(); return false; }); //Need this to disable the menu that pops up on right clicking
        this.mesh = new HedgeMesh();
        this.camera = new MousePolarCamera(glcanvas.width, glcanvas.height);
        // Setup drawer object for debugging.  It is undefined until
        // the pointColorShader is ready
        let canvas = this;
        if (!('shaderReady' in this.shaders.pointColorShader)) {
            this.shaders.pointColorShader.then(function() {
                canvas.drawer = new SimpleDrawer(canvas.gl, canvas.shaders.pointColorShader);
            })
        }
        else {
            this.drawer = new SimpleDrawer(this.gl, this.shaders.pointColorShader);
        }
        this.bbox = new AABox3D(0, 1, 0, 1, 0, 1);
        this.setupMenus();
    }

    centerCamera() {
        this.bbox = this.mesh.getBBox();
        this.camera.centerOnBBox(this.bbox);
    }

    /**
     * Setup GUI menus for students to test their functions
     */
    setupMenus() {
        this.gui = new dat.GUI();
        const gui = this.gui;
        let canvas = this;
        let simpleRepaint = function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        }
        // Mesh display options menu
        this.drawMesh = true;
        this.drawEdges = false;
        this.drawNormals = false;
        this.drawVertices = false;
        let meshOpts = gui.addFolder('Mesh Display Options');
        ['drawMesh', 'drawEdges', 'drawNormals', 'drawPoints'].forEach(
            function(s) {
                let evt = meshOpts.add(canvas, s);
                evt.onChange(simpleRepaint);
            }
        );

        function copyInMesh(mesh) {
            canvas.mesh.vertices = mesh.vertices;
            canvas.mesh.edges = mesh.edges;
            canvas.mesh.faces = mesh.faces;
            canvas.mesh.needsDisplayUpdate = true;
        }

        let creationMenu = gui.addFolder("Subdivision");
        this.doLoopSubdivision = function() {
            copyInMesh(canvas.mesh.doLoopSubdivision());
            simpleRepaint();
        }
        creationMenu.add(this, 'doLoopSubdivision');
        
        let dualMenu = gui.addFolder("Dual Graph");
        this.drawDualGraph = function() {
            copyInMesh(canvas.mesh.getDualGraph())
            simpleRepaint();
        }
        dualMenu.add(this, 'getDualGraph');

        gui.add(this.mesh, 'saveOffFile').onChange(simpleRepaint);
        simpleRepaint();
    }

    getDualGraph(){
        let drawer = this.drawer;
        let path = this.mesh.getNodes()
        let edges = this.mesh.getNodeEdges(path)
        for(let i = 0; i < path.length; i++){
            drawer.drawPoint(path[i].center, [1,0,0])
            drawer.drawLine(edges[i].p1.center, edges[i].p2.center, [0,1,0])
        }
        this.repaint();
    }

    /**
     * Code for drawing the mesh and debugging information
     */
    repaint() {
        let canvas = this;
        let drawer = this.drawer;
        if (!('shaderReady' in this.shaders.blinnPhong)) {
            // Wait until the promise has resolved, then draw again
            this.shaders.blinnPhong.then(canvas.repaint.bind(canvas));
            return;
        }
        if (!('shaderReady' in this.shaders.pointColorShader)) {
            // Wait until the promise has resolved, then draw again
            this.shaders.pointColorShader.then(canvas.repaint.bind(canvas));
            return;
        }
        let gl = this.gl;
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.lineWidth(LINE_WIDTH);

        this.lights = [];
        let bbox = this.bbox;
        let R = this.camera.right;
        let U = this.camera.up;
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, R, U);
        let d = bbox.getDiagLength();
        for (let x = -1; x <= 1; x+=2) {
            for (let y = -1; y <= 1; y+=2) {
                for (let z = -1; z <= 1; z+=2) {
                    let pos = glMatrix.vec3.create();
                    glMatrix.vec3.copy(pos, bbox.getCenter());
                    glMatrix.vec3.scaleAndAdd(pos, pos, R, x*d);
                    glMatrix.vec3.scaleAndAdd(pos, pos, U, y*d);
                    glMatrix.vec3.scaleAndAdd(pos, pos, T, z*d);
                    this.lights.push({pos:pos, color:[0.1, 0.1, 0.1], atten:[1, 0, 0]});
                }
            }
        }
        this.lights.push({pos:this.camera.pos, color:[1, 1, 1], atten:[1, 0, 0]});
        this.shaderToUse = this.shaders.blinnPhong;
        if (this.drawMesh) {
            this.mesh.render(this);
        }
        drawer.repaint(this.camera);
    }
}
