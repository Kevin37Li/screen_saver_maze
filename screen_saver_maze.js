import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class ScreenSaverMaze extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.pressed = false;
        this.desired = Mat4.identity();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            cube: new defs.Cube(),
            axes: new defs.Axis_Arrows(),
            ball: new defs.Subdivision_Sphere(4),       
            sphere: new defs.Subdivision_Sphere(4),
                   
        };
        //needed for axis arrows
        const bump = new defs.Fake_Bump_Map();
        this.material = new Material(bump, {
            color: color(0, 0, 0, 1), ambient: 1,
            texture: new Texture("assets/rgb.jpg")
        });

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),{
                ambient: 0.5,
                diffusivity: 0.6,
                color: hex_color("#ffffff")
            }),
            yellowfloor: new Material(new Textured_Phong(), {
                color: hex_color("#000000"), //opaque black
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture2: new Texture("assets/earth.gif", "NEAREST") // "NEAREST" 
            }),
        ball: new Material(new defs.Phong_Shader(), {
                ambient:1, 
                diffusivity: 1, 
                specularity: 1, 
                color: hex_color("#ffffff")}),
        };
        
        //POV camera location
        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
        //Scale factor of maze
        this.scalefactor = 1;
        //Birds eye view of maze
        this.birds_eye_location = Mat4.look_at(vec3(0,10*this.scalefactor,0),vec3(0,0,0),vec3(0,0,-1))//.times(Mat4.translation(-12*this.scalefactor,-12*this.scalefactor,-4.5*this.scalefactor));
        this.isW95 = false;
        
        //Omar: alternate birds eye location 
        this.bird_transform = Mat4.identity().times(Mat4.translation(24, 33, 10));
        this.bird_transform = this.bird_transform.times(Mat4.rotation(-1.57, 1, 0, 0));
        this.bird = this.bird_transform;

        //movement flags 
        this.look_right = false; 
        this.look_left = false; 
        this.move_forward = false;
        this.look_backward = false; 

        //1 is facing forward (towards top of maze)
        //2 is facing right 
        //3 is facing backward (towards bottom of maze)
        //4 is facing left 
        this.facing = 1; 

        //this is the player (key will always be 1)
        this.me_transform = Mat4.identity().times(Mat4.translation(1, 0.5, 17));
        this.me_transform = this.me_transform.times(Mat4.scale(.5, .5, .5));
        this.me = this.me_transform;

        //dictionary of every object in our world 
        //keep a key for every object, and the space it occupies in our world 
        //all colliders will be squares/rectangles (AABB)
        //list = [minX, maxX, minY, maxY, minZ, maxZ]
        //starting sphere is at coordinate (1, 0.5, 17) with radius 0.5 so it's list is [0.5, 1.5, 0, 1, 16.5, 17.5]
        this.colliders = {1: [0.5, 1.5, 0, 1, 16.5, 17.5], 
          /*ltrb boundaries*/2: [-1.1, -1, 0, 5, -17, 15], 3: [0, 95, 0, 5, -17, -17.1], 4: [95, 95.1, 0, 5, -17, 15], 5: [0, 95, 0, 5, 19, 19.1],
          /*U boundaries*/6: [3, 3.1, 0, 5, -13, 15], 7: [7.3, 7.4, 0, 5, -13, 11], 8: [15, 15.1, 0, 5, -13, 11], 9: [19, 19.1, 0, 5, -13, 15], 10: [7.3, 15, 0, 5, 11, 11.1], 11: [3, 19, 0, 5, 15, 15.1], 
          /*U misc booundaries*/12: [11, 11.1, 0, 5, -17, -5], 13: [11, 11.1, 0, 5, 3, 7], 14: [11, 11.1, 0, 5, 15, 19], 15: [7.3, 11.1, 0, 5, -5, -4.9], 16: [7.3, 11.1, 0, 5, 7, 7.1], 17: [11.1, 15, 0, 5, -1, -1.1],
          /*U connect with C*/18: [22.6, 22.7, 0, 5, -17, -5], 19: [22.6, 22.7, 0, 5, -1, 19], 20: [22.6, 26.7, 0, 5, -5.1, -5],
          /*C boundaries*/21: [26.6, 26.6, 0, 5, -13, 15], 22: [26.4, 42.6, 0, 5, -13, -13.1], 23: [26.6, 42.6, 0, 5, 15, 15.4], 24: [30.6, 30.6, 0, 5, -9, 11], 25: [30.6, 42.6, 0, 5, -9.1, -9], 26: [30.6, 42.6, 0, 5, 11, 11.1],
          /*C misc boundaries*/ 27: [35.4, 35.4, 0, 5, -5, -1], 28: [35.6, 38.6, 0, 5, -5.1, -5], 29: [35.4, 42.6, 0, 5, -1, -1.1], 30: [42.4, 42.6, 0, 5, -9, -1], 31: [35.4, 35.4, 0, 5, 3, 7], 32: [35.4, 46.5, 0, 5, 3, 3.4], 33: [35.4, 46.5, 0, 5, 7.1, 7.1], 34: [42.6, 46.6, 0, 5, -5.1, -5.1], 
          /*C connect with L*/35: [46.6, 46.7, 0, 5, -13, 3], 36: [46.6, 46.7, 0, 5, 7, 19], 37: [46.6, 50.6, 0, 5, -13, -13.1],
          /*L boundaries*/38: [50.6, 50.6, 0, 5, -13, 15], 39: [55.1, 55.1, 0, 5, -13, 11], 40: [55.1, 67, 0, 5, 11, 11.4], 41: [50.6, 67, 0, 5, 15, 15.4],
          /*L misc boundaries*/ 42: [55.1, 63, 0, 5, -13.1, -13], 43: [55.1, 59, 0, 5, -9.1, -9], 44: [59, 63, 0, 5, -5.1, -5], 45: [59, 67, 0, 5, 3, 3.1], 46: [63, 71, 0, 5, -1.1, -1], 47: [63, 71, 0, 5, 7, 7.1], 48: [67, 71, 0, 5, -13.1, -13],
                                49: [63, 63.1, 0, 5, -17, -5], 50: [67, 67.1, 0, 5, -17, -5], 51: [59, 59.1, 0, 5, -5, 7],
          /*L connect A*/ 52: [71, 71.1, 0, 5, -13, -5], 53: [71, 71.1, 0, 5, -1, 3], 54: [71, 71.1, 0, 5, 7, 19], 
          /*A boundaries*/ 55: [75, 75.1, 0, 5, -13, 15], 56: [79, 79.1, 0, 5, -9, -1], 57: [79, 79.1, 0, 5, 3, 15],
                            58: [87, 87.1, 0, 5, -9, -1], 59: [87, 87.1, 0, 5, 3, 15], 60: [91, 91.1, 0, 5, -13, 15], 
                            61: [75, 91, 0, 5, -13.1, -13], 62: [79, 87, 0, 5, -9.1, -9], 63: [79, 87, 0, 5, -1.1, -1], 64: [79, 87, 0, 5, 3, 3.1], 
          /*A misc boundaries*/ 65: [71, 75, 0, 5, 3, 3.1], 66: [83, 83.1, 0, 5, 7, 19], 67: [83, 87, 0, 5, 15, 15.1], 68: [91, 95, 0, 5, 11, 11.1]

          };

    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.


        this.key_triggered_button("Reset to Beginning", ["Control", "0"], () => this.attached = () => this.initial_camera_location.times(Mat4.translation(0,-2,-20)));
        this.new_line();
        this.key_triggered_button("Birds Eye View", ["Control", "1"], () => this.attached = () => this.birds_eye_location); 
        this.key_triggered_button("Toggle Windows 95", ["v"], ()=>{
            // TODO:  Requirement 3d:  Set a flag here that will toggle your swaying motion on and off.
            this.isW95 ^= 1;
        });
        this.key_triggered_button("Help", ["Control", "h"], () => this.attached = () => this.bird);
        this.key_triggered_button("Player POV", ["m"], () => this.attached = () => this.me);
        this.new_line();
        this.key_triggered_button("Turn Right", ["l"], () => {
            this.look_right = !(this.look_right);
        }); 
        this.key_triggered_button("Turn Left", ["j"], () => {
            this.look_left = !(this.look_left);
        }); 
        this.new_line(); 
        this.key_triggered_button("Move Forward", ["i"], () => {
            this.move_forward = !(this.move_forward);
        });
        this.key_triggered_button("Turn Around", ["k"], () => {
            this.look_backward = !(this.look_backward);
        });

    }

    //AABB is Axis Aligned Bounding Box
    //AABB vs AABB collision: collision occurs when two bounding boxes overlap
    //learn more here: https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection 
    collision_occured(colliders) {
        let player_pos = colliders[1];
        let len = Object.keys(colliders).length;
        let crash = false;

        //go through the colliders, check if our player overlaps with any of them. 
        for (let i = 2; i < len+1; i++) {
            if (this.facing == 1) {
                if ( (player_pos[0] <= colliders[i][1] && player_pos[1] >= colliders[i][0]) && 
                        (player_pos[2] <= colliders[i][3] && player_pos[3] >= colliders[i][2]) && 
                        ( (player_pos[4] - 1.0) <= colliders[i][5] && (player_pos[5] - 1.0) >= colliders[i][4]) ) {
                            /*console.log("-----");
                            console.log("crash 1");
                            console.log(player_pos);
                            console.log(colliders[i]);
                            console.log("-----");*/
                            crash = true; 
                            break;
                }
            } else if (this.facing == 2) {
                if ( ( (player_pos[0] + 1.0) <= colliders[i][1] && (player_pos[1] + 1.0) >= colliders[i][0]) && 
                        (player_pos[2] <= colliders[i][3] && player_pos[3] >= colliders[i][2]) && 
                        ( player_pos[4] <= colliders[i][5] && player_pos[5] >= colliders[i][4]) ) {
                            /*console.log("-----");
                            console.log("crash 2");
                            console.log(player_pos);
                            console.log(colliders[i]);
                            console.log("-----");*/
                            crash = true;
                            break;
                }

            } else if (this.facing == 3) {
                if (    ((player_pos[0] <= colliders[i][1]) && (player_pos[1] >= colliders[i][0])) && 
                        ((player_pos[2] <= colliders[i][3]) && (player_pos[3] >= colliders[i][2])) && 
                        (((player_pos[4] + 1.0) <= colliders[i][5]) && ((player_pos[5] + 1.0) >= colliders[i][4])) ) {
                            /*console.log("-----");
                            console.log("crash 3");
                            console.log(player_pos);
                            console.log(colliders[i]);
                            console.log("-----");*/
                            crash = true; 
                            break;
                }
            
            }else if (this.facing == 4) {
                if ( ((player_pos[0] - 1.0) <= colliders[i][1] && (player_pos[1] - 1.0) >= colliders[i][0]) && 
                        (player_pos[2] <= colliders[i][3] && player_pos[3] >= colliders[i][2]) && 
                        (player_pos[4] <= colliders[i][5] && player_pos[5] >= colliders[i][4]) ) {
                            /*console.log("-----");
                            console.log("crash 4");
                            console.log(player_pos);
                            console.log(colliders[i]);
                            console.log("-----");*/
                            crash = true; 
                            break;

               }
            }
        }
        return crash;
    }

    draw_wall(context,program_state,model_transform,matl,inc,start_x,start_z,numtodraw){
        model_transform = Mat4.translation(start_x*this.scalefactor,0,start_z*this.scalefactor).times(model_transform);

        for (let boxnum = 0; boxnum < numtodraw; boxnum++) {
            this.shapes.cube.draw(context,program_state,model_transform,matl);
            model_transform = inc.times(model_transform);
        }


    }

    draw_objects(context,program_state,model_transform,matl,start_x,start_z,num_to_draw) {

        let gap = this.scalefactor/(num_to_draw+1)
        let ball_scale_factor = gap/5;
        model_transform = model_transform.times(Mat4.translation(0,gap,0))
                                         .times(Mat4.scale(ball_scale_factor,ball_scale_factor,ball_scale_factor))
                                         .times(Mat4.translation(start_x*(this.scalefactor/ball_scale_factor),0,start_z*(this.scalefactor/ball_scale_factor)))
                                         ;


        for (let object_num = 0; object_num < num_to_draw; object_num++) {
            this.shapes.ball.draw(context,program_state,model_transform,matl);
            model_transform = Mat4.translation(0,gap,0).times(model_transform);
        }

    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            
            //program_state.set_camera(this.initial_camera_location.times(Mat4.translation(0,-2,-20)));
            program_state.set_camera(this.birds_eye_location.times(Mat4.translation(-12*this.scalefactor,-12*this.scalefactor,-4.5*this.scalefactor)));
            //program_state.set_camera(this.birds_eye_location);
        }

        // Initialize projection transform
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        
        // model time
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // LIGHTING
        const light_position = vec4(-10, 100, -10, 1);
        // The parameters of the Light are: position, color, size
        // color is set to white (1,1,1,1), with size factor corresponding to 10 to the n-power.
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10000)];
        
        // colors
        const yellow = hex_color("#fac91a");
        const blue = hex_color("#1a9ffa");

        // Initialize Model Transform
        let model_transform = Mat4.identity();

        // Draw axis at origin for reference/debugging
        this.shapes.axes.draw(context,program_state,model_transform,this.material);

        // =============================
        // ------ Control Movement -----
        // =============================
        var desired = 0;
        var blending_factor = 0.1;
        if(this.attached && this.attached() !== null) {
            desired = Mat4.inverse(this.attached().times(Mat4.translation(0, 2, 1)));
            program_state.camera_inverse = desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
            
        }
        
        if (this.look_right) {
            this.me_transform = this.me_transform.times(Mat4.rotation(-1.57, 0, 1, 0));
            this.facing += 1; 
            if (this.facing == 5){
                this.facing = 1;
            }
            this.me = this.me_transform; 
            this.look_right = false;
        } else if (this.look_left) {
            this.me_transform = this.me_transform.times(Mat4.rotation(1.57, 0, 1, 0));
            this.facing -= 1; 
            if (this.facing == 0) {
                this.facing = 4;
            }
            this.me = this.me_transform;
            this.look_left = false;
        } else if (this.move_forward) {
            
            if (this.collision_occured(this.colliders)) {
                //collision detected, so we don't move 
            } else {
                this.me_transform = this.me_transform.times(Mat4.translation(0, 0, -1.0));
                if (this.facing == 1) {
                   
                    this.colliders[1][4] += -1.0; 
                    this.colliders[1][5] += -1.0; 
                } else if (this.facing == 2) {
                    
                    this.colliders[1][0] += 1.0; 
                    this.colliders[1][1] += 1.0;
                    
                } else if (this.facing == 3) {
                   
                    this.colliders[1][4] += 1.0; 
                    this.colliders[1][5] += 1.0;
                } else if (this.facing == 4) {
                    
                    this.colliders[1][0] += -1.0; 
                    this.colliders[1][1] += -1.0;
                }
            }
            this.me = this.me_transform;
            this.move_forward = false;
        } else if (this.look_backward) {
            //turn around 180 
            this.me_transform = this.me_transform.times(Mat4.rotation(1.57, 0, 1, 0));
            this.me_transform = this.me_transform.times(Mat4.rotation(1.57, 0, 1, 0));
            if (this.facing == 1) {
                this.facing = 3;
            } else if (this.facing == 2) {
                this.facing = 4; 
            } else {
                this.facing -= 2; 
            }
            this.me = this.me_transform;
            this.look_backward = false;
        }

        // =============================
        // --------- DRAW MAZE ---------
        // =============================
        
        // create the building blocks of the maze (model transform matrices for cubes)
        let half = this.scalefactor/2;
        let squish = 0.01*this.scalefactor;
        let wall_xy = model_transform.times(Mat4.translation(half,half,0)).times(Mat4.scale(half,half,squish));
        let wall_yz = model_transform.times(Mat4.translation(0,half,half)).times(Mat4.scale(squish,half,half));
        let floor = model_transform.times(Mat4.translation(half,0,half)).times(Mat4.scale(half,squish,half));
        let bluefloor = model_transform.times(Mat4.translation(half,squish,half)).times(Mat4.scale(half,squish,half));
        let ceiling = model_transform.times(Mat4.translation(half,this.scalefactor,half)).times(Mat4.scale(half,squish,half));
        
        // specify each type of material
        let wallMatl = this.materials.plastic;
        let floorMatl = this.materials.plastic.override({color:yellow});
        let blueMatl = this.materials.plastic.override({color:blue});
        
        // specify the translation matrix by which each wall/floor will iteratively "grow" when draw_wall is called.
        let inc_z = Mat4.translation(0,0,this.scalefactor);
        let inc_x = Mat4.translation(this.scalefactor,0,0);
        
        // Switch to Windows95 theme (TODO: switch balls to Gouraud Shader)
        if (this.isW95){
            floorMatl = this.materials.yellowfloor;
            /*for (let i = 0; i < 24; i++){
                this.draw_wall(context,program_state,ceiling,floorMatl,inc_z,i,0,9);
                }*/
            

        }

        //draw floor
        for (let i = 0; i < 24; i++){
            this.draw_wall(context,program_state,floor,floorMatl,inc_z,i,0,9);
        }

        //draw boundary walls
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,0,0,8); //left wall
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,24,0,8); //right wall
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,0,0,24); //top wall
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,0,9,24); //bottom wall

        //draw U floor
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,1,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,4,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,2,7,2);

        //draw U walls
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,1,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,5,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,2,1,6);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,4,1,6);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,1,8,4);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,2,7,2);

        //draw C floor
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,7,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,8,1,3);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,8,7,3);

        //draw C walls
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,7,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,8,2,5);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,7,8,4);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,7,1,4);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,8,2,3);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,8,7,3);

        //draw L floor
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,13,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,14,7,3);

        //draw L walls
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,13,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,14,1,6);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,13,8,4);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,14,7,3);

        //draw A floor
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,19,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_z,22,1,7);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,20,1,2);
        this.draw_wall(context,program_state,bluefloor,blueMatl,inc_x,20,4,2);

        //draw A walls
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,19,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,20,2,2);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,22,2,2);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,23,1,7);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,20,5,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,22,5,3);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,19,1,4);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,20,2,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,20,4,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,20,5,2);

        //draw misc walls
        // U
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,3,8,1);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,3,0,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,3,5,1);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,6,0,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,6,4,5);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,2,3,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,3,4,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,2,6,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,6,3,1);
        // C 
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,12,1,4);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,12,6,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,11,2,2);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,9,3,1);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,9,5,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,11,3,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,9,3,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,9,4,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,9,5,3);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,9,6,3);
        // L
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,18,6,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,18,1,2);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,18,4,1);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,16,0,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,17,0,3);
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,15,3,3);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,12,1,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,14,1,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,14,2,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,15,3,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,16,4,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,15,5,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,16,6,2);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,17,1,1);
        // A
        this.draw_wall(context,program_state,wall_yz,wallMatl,inc_z,21,6,3);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,18,5,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,21,8,1);
        this.draw_wall(context,program_state,wall_xy,wallMatl,inc_x,23,7,1);

        //Player Sphere
        this.shapes.sphere.draw(context, program_state, this.me_transform, this.materials.plastic);
        

        //this.draw_wall(context,program_state,floor,this.materials.plastic,inc_x,1,1,2);

        //this.shapes.cube.draw(context, program_state, wall_xy, this.materials.plastic);
        //this.shapes.cube.draw(context, program_state, inc_xy.times(wall_xy), this.materials.plastic);
        //this.shapes.cube.draw(context, program_state, wall_yz, this.materials.plastic);
        //this.shapes.cube.draw(context, program_state, floor, this.materials.plastic);


        // =============================
        // --------- DRAW OBJECT ---------
        // =============================


        let ball_group_1 = model_transform.times(Mat4.translation(half,squish,half));

        this.draw_objects(context,program_state,ball_group_1,this.materials.ball,0,1,5);
        

    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec3 vertex_color; // add new varying vec3 to store vertex color
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // our varying vec3 is populated by phong_model_lights in vertex shader, as opposed to fragment
                vertex_color = phong_model_lights(N,vertex_worldspace);

            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // fragment shader just collects a value from our varying vertex color
                gl_FragColor = vec4(vertex_color.xyz, 1.0);
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            // Vertex's final resting place (in NDCS):
            gl_Position = projection_camera_model_transform * vec4 (position, 1.0);
            // declare point position in OCS (convert to homogeneous representation)
            point_position = vec4(position, 1.0); 
            // declare center point in OCS (convert to homogeneous representation)
            center = vec4 (0.0,0.0,0.0,1.0);         
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        uniform vec4 shape_color;

        void main(){
          // implemented distance function to calculate distance from center to OCS point
          // trial and error until a multiplier of 50 was reached to match the example
          float factor = 0.5+0.5*sin(50.0 * distance(center,point_position));
          // mix color according to factor
          vec4 mix_color = vec4(shape_color.xyz, factor);
          // declare the fragment color according to the mixed color
          gl_FragColor = mix_color;
        }`;
    }
}

