import {groupByKey, Keys, Values} from "../Utils";

describe("Utils tests => ", () => {

  it("Reduces an array with group by query", () => {
    
   const actualArray = [{"price": 0.8, "value": 1}, {"price": 0.8, "value": 2}, {"price": 0.85, "value": 1}, {"price": 0.86, "value": 1}, 
   {"price": 0.9, "value": 1},{"price": 0.92, "value": 2}, {"price": 0.92, "value": 4}, {"price": 0.8, "value": 4}]

   const expectedReduction = {
       "0.8": {"price": 0.8, "value":7},
       "0.85": {"price": 0.85, "value":1},
       "0.86": {"price": 0.86, "value":1},
       "0.9": {"price": 0.9, "value":1},
       "0.92": {"price": 0.92, "value":6}
   }

    expect(groupByKey(actualArray, "price", "value")).toEqual(expectedReduction);
  });

  it("Gets keys from dict in correct order", () => {
    
    const actualDict = {
        "0.8": {"price": 0.8, "value":7},
        "0.85": {"price": 0.85, "value":1},
        "0.86": {"price": 0.86, "value":1},
        "0.9": {"price": 0.9, "value":1},
        "0.92": {"price": 0.92, "value":6}
    }

    const expectedKeys = ["0.8", "0.85", "0.86", "0.9", "0.92"]
 
     expect(Keys(actualDict)).toEqual(expectedKeys);
   });

  it("Gets values from dict in correct order", () => {
    
    const actualDict = {
        "0.8": {"price": 0.8, "value":7},
        "0.85": {"price": 0.85, "value":1},
        "0.86": {"price": 0.86, "value":1},
        "0.9": {"price": 0.9, "value":1},
        "0.92": {"price": 0.92, "value":6}
    }
    const expectedValues = [{"price": 0.8, "value":7}, {"price": 0.85, "value":1}, {"price": 0.86, "value":1}, {"price": 0.9, "value":1}, {"price": 0.92, "value":6}]
     expect(Values(actualDict)).toEqual(expectedValues);
   });

});