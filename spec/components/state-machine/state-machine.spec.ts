import { createRequestScope } from "../../support/util/setup";
import { registerHook, createSpyHook } from "../../support/mocks/state-machine/hook";
import { Container } from "inversify-components";


describe("StateMachine", function() {
  beforeEach(function() {
    createRequestScope(this.specHelper);
    this.stateMachine = this.container.inversifyInstance.get("core:state-machine:current-state-machine");
  });

  describe("handleIntent", function() {
    beforeEach(function() {
      this.stateSpyResult = [];
      this.stateSpy = (...args: any[]) => this.stateSpyResult = args;
      (this.container as Container).inversifyInstance.bind("mocks:states:call-spy").toFunction(this.stateSpy);
    })

    it("always operates on current intent", async function(done) {
      await this.stateMachine.handleIntent("test");
      expect(this.stateSpyResult[0].constructor.name).toEqual("MainState");

      await this.stateMachine.transitionTo("SecondState");
      await this.stateMachine.handleIntent("test");
      expect(this.stateSpyResult[0].constructor.name).toEqual("SecondState");

      done();
    })

    describe("when given intent exists in state class", function() {
      describe("when given intent does not throw an error", function() {
        beforeEach(async function(done) {
          await this.stateMachine.handleIntent("test", "param1");
          done();
        });

        it("calls the given intent", function() {
          expect(this.stateSpyResult[1]).toEqual("test");
        });

        it("gives state machine as parameter", function() {
          expect(this.stateSpyResult[2]).toEqual(this.stateMachine);
        });

        it("gives additional given arguments as parameter", function() {
          expect(this.stateSpyResult[3]).toEqual("param1");
        });
      });

      describe("when given intent throws an exception", function() {
        describe("when there is an errorFallback method defined", function() {
          beforeEach(async function(done) {
            await this.stateMachine.handleIntent("error");
            done();
          });

          it("calls the fallback method", function() {
            expect(this.stateSpyResult[1]).toEqual("errorFallback");
          });

          it("passes correct arguments", function() {
            expect(this.stateSpyResult[2].constructor).toEqual(Error);
            expect(this.stateSpyResult[3].constructor.name).toEqual("MainState");
            expect(this.stateSpyResult[4]).toEqual("MainState");
            expect(this.stateSpyResult[5]).toEqual("errorIntent");
            expect(this.stateSpyResult[6]).toBe(this.stateMachine);
          });
        });

        describe("when there is no errorFallback method defined", function() {
          beforeEach(async function(done) {
            await this.stateMachine.transitionTo("SecondState");
            done();
          });

          it("throws an exception", async function(done) {
            try {
              await this.stateMachine.handleIntent("error");
              fail();
            } catch (e) {
              expect(true).toBeTruthy();
            }

            done();
          });
        });
      });
    });

    describe("when given intent does not exist in state class", function() {
      beforeEach(async function(done) {
        await this.stateMachine.handleIntent("notExisting", "param1");
        done();
      });

      it("calls unhandled intent", function() {
        expect(this.stateSpyResult[1]).toEqual("unhandled");
      });

      it("adds original intent as parameter", function() {
        expect(this.stateSpyResult[3]).toEqual("notExistingIntent");
      });

      it("gives state machine as parameter", function() {
        expect(this.stateSpyResult[2]).toEqual(this.stateMachine);
      });

      it("gives additional given arguments as parameter", function() {
        expect(this.stateSpyResult[4]).toEqual("param1");
      });

      describe("when unhandledGenericIntent throws an exception", function() {
        describe("when there is an errorFallback method defined", function() {
          beforeEach(async function(done) {
            await this.stateMachine.transitionTo("UnhandledErrorWithFallbackState");
            await this.stateMachine.handleIntent("notExisting");
            done();
          });

          it("calls the fallback method", function() {
            expect(this.stateSpyResult[1]).toEqual("errorFallback");
          });

          it("passes correct arguments", function() {
            expect(this.stateSpyResult[2].constructor).toEqual(Error);
            expect(this.stateSpyResult[3].constructor.name).toEqual("UnhandledErrorWithFallbackState");
            expect(this.stateSpyResult[4]).toEqual("UnhandledErrorWithFallbackState");
            expect(this.stateSpyResult[5]).toEqual("unhandledGenericIntent");
            expect(this.stateSpyResult[6]).toEqual(this.stateMachine);
            expect(this.stateSpyResult[7]).toBe("notExistingIntent");
          });
        });

        describe("when there is no errorFallback method defined", function() {
          beforeEach(async function(done) {
            await this.stateMachine.transitionTo("UnhandledErrorState");
            done();
          });

          it("throws an exception", async function(done) {
            try {
              await this.stateMachine.handleIntent("notExisting");
              fail();
            } catch (e) {
              expect(true).toBeTruthy();
            }

            done();
          });
        });
      });
    });

    describe("with afterIntent hook given", function() {
      beforeEach(function() {
        this.spyResult = [];
        registerHook(this.container, false, createSpyHook(intent => this.spyResult.push(intent)));
      });

      describe("when given intent does not exist on state class", function() {
        beforeEach(async function(done) {
          await this.stateMachine.handleIntent("notExisting");
          done();
        });

        it("calls hook only once", function() {
          expect(this.spyResult.length).toEqual(1);
        });

        it("calls hook after executing unhandledGenericIntent", function() {
          expect(this.spyResult[0]).toEqual("unhandledGenericIntent");
        })
      });

      it("calls hook", async function(done) {
        await this.stateMachine.handleIntent("test");
        expect(this.spyResult[0]).toEqual("testIntent");
        done();
      });
    });

    describe("with beforeIntent hooks given", function() {
      beforeEach(function() {
        this.spyResult = [];
        registerHook(this.container, true, createSpyHook(intent => this.spyResult.push(intent)));

        registerHook(this.container);
      });

      it("calls hook", async function(done) {
        await this.stateMachine.handleIntent("other");
        expect(this.spyResult[0]).toEqual("otherIntent");
        done();
      });

      it("allows hook to intercept execution of intent", async function(done) {
        await this.stateMachine.handleIntent("test");
        expect(this.stateSpyResult).toEqual([]);
        done();
      });

      describe("when given intent does not exist", function() {
        beforeEach(async function(done) {
          await this.stateMachine.handleIntent("notExisting");
          done();
        });

        it("calls hook two times", function() {
          expect(this.spyResult.length).toEqual(2);
        })

        it("calls hook with unhandledGenericIntent", function() {
          expect(this.spyResult[1]).toEqual("unhandledGenericIntent");
        });

        it("calls hook with original intent", function() {
          expect(this.spyResult[0]).toEqual("notExistingIntent");
        });
      });
    });
  });

  describe("transitionTo", function() {
    it("transitions to given state", async function(done) {
      await this.stateMachine.transitionTo("SecondState");
      let currentState = await this.stateMachine.getCurrentState();
      expect(currentState.name).toEqual("SecondState");
      done();
    });

    describe("when given state is not registered in state machine", function() {
      it("throws an exception", function() {
        expect(() => this.currentState.transitionTo("SubState")).toThrowError();
      });
    })
  });

  describe("redirectTo", function() {
    beforeEach(async function(done) {
      spyOn(this.stateMachine, "transitionTo");
      spyOn(this.stateMachine, "handleIntent");

      await this.stateMachine.redirectTo("SecondState", "test", "param1", "param2");
      done();
    });

    it("calls transitionTo with given state", function() {
      expect(this.stateMachine.transitionTo).toHaveBeenCalledWith("SecondState");
    });

    it("calls handleIntent with given intent and args", function() {
      expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", "param1", "param2");
    });
  });

  describe("stateExists", function() {
    it("returns true for registered states", function() {
      expect(this.stateMachine.stateExists("MainState")).toBeTruthy();
    });

    it("returns false for not existing states", function() {
      expect(this.stateMachine.stateExists("NotExistingState")).toBeFalsy();
    });
  });
});