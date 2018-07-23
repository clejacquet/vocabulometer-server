// const winston = require('winston');
//
// module.exports = (mongoose) => {
//     return (model, functionDescriptors) => {
//         const additionalDescriptors = [];
//
//         // Replace the missing properties by default ones
//         functionDescriptors = functionDescriptors.map(functionDescriptor => {
//             if (!functionDescriptor.hasOwnProperty('idType')) {
//                 functionDescriptor.idType = mongoose.Schema.Types.ObjectId;
//             }
//
//             if (!functionDescriptor.hasOwnProperty('model')) {
//                 functionDescriptor.model = model;
//             }
//
//             if (!functionDescriptor.hasOwnProperty('invalidates')) {
//                 functionDescriptor.invalidates = [];
//             } else {
//                 functionDescriptor.invalidates = functionDescriptor.invalidates.map(invalidated => {
//                     if (typeof invalidated === 'string') {
//                         return {
//                             model: functionDescriptor.model,
//                             funcName: invalidated
//                         }
//                     } else {
//                         return invalidated;
//                     }
//                 })
//             }
//
//             if (!functionDescriptor.hasOwnProperty('invalidatedBy')) {
//                 functionDescriptor.invalidatedBy = [];
//             } else {
//                 functionDescriptor.invalidatedBy = functionDescriptor.invalidatedBy.map(invalidator => {
//                     if (typeof invalidator === 'string') {
//                         return {
//                             model: model,
//                             funcName: invalidator
//                         }
//                     } else {
//                         return invalidator;
//                     }
//                 })
//             }
//
//             if (!functionDescriptor.hasOwnProperty('prefix')) {
//                 functionDescriptor.prefix = '';
//             }
//
//             if (!functionDescriptor.hasOwnProperty('cache')) {
//                 functionDescriptor.cache = true;
//             }
//
//             return functionDescriptor;
//         });
//
//         functionDescriptors.forEach(functionDescriptor => {
//             functionDescriptor.invalidatedBy.forEach(invalidator => {
//                 const foundFunctionDescriptor = functionDescriptors.find((elem) => elem.funcName === invalidator.funcName);
//                 if (foundFunctionDescriptor) {
//                     foundFunctionDescriptor.invalidates.push(invalidator);
//                 } else {
//                     const additional = additionalDescriptors.find((elem) => elem.funcName === invalidator.funcName);
//
//                     if (additional) {
//                         additional.invalidates.push(invalidator);
//                     } else {
//                         additionalDescriptors.push({
//                             cache: false,
//                             model: invalidator.model,
//                             funcName: invalidator.funcName,
//                             invalidates: [functionDescriptor]
//                         })
//                     }
//
//                 }
//             });
//         });
//
//         functionDescriptors.push(...additionalDescriptors);
//
//
//
//         // For each function of the model whose result has to be cached...
//         functionDescriptors.forEach(functionDescriptor => {
//             let cacheModel;
//
//             if (functionDescriptor.cache) {
//                 functionDescriptor.collectionName = '_' + functionDescriptor.prefix + '_' + functionDescriptor.funcName;
//
//                 // First, building the schema of the cached collection on MongoDB
//                 const schema = {
//                     _result: mongoose.Schema.Types.Mixed
//                 };
//
//                 schema[functionDescriptor.idName] = functionDescriptor.idType;
//
//                 const cacheSchema = new mongoose.Schema(
//                     schema,
//                     {
//                         collection: functionDescriptor.collectionName
//                     });
//
//                 const index = {};
//                 index[functionDescriptor.idName] = 1;
//
//                 cacheSchema.index(index);
//
//                 // The Schema is now built, then the model's turn
//                 cacheModel = mongoose.model(functionDescriptor.collectionName, cacheSchema);
//             }
//
//
//             if (!functionDescriptor.model[functionDescriptor.funcName].isCaching) {
//                 // The original function is hidden in order not to be accessed directly later
//                 functionDescriptor.model['_' + functionDescriptor.funcName] = functionDescriptor.model[functionDescriptor.funcName];
//             }
//
//
//             // The function is here replaced by the cache routine
//             functionDescriptor.model[functionDescriptor.funcName] = (...args) => {
//                 functionDescriptor.invalidates.forEach(invalidated => {
//                     invalidated.model[invalidated.funcName].invalidate();
//                 });
//
//                 if (functionDescriptor.cache) {
//
//
//                     // First, try to find the item in the cache
//
//                     const findQuery = {};
//                     findQuery[functionDescriptor.idName] = args[0];
//                     const cb = args[args.length - 1];
//                     const allButCb = args.slice(0, -1);
//
//                     cacheModel.findOne(findQuery, (err, result) => {
//                         if (err) {
//                             winston.log('error', err);
//                         }
//
//                         if (!result) {
//                             // If not found, then process the original function
//                             functionDescriptor.model['_' + functionDescriptor.funcName](...allButCb, (err, result) => {
//                                 if (err) {
//                                     return cb(err);
//                                 }
//
//                                 cb(undefined, result);
//
//                                 // Store the result in the cache for the next time
//                                 const createQuery = {
//                                     _result: result
//                                 };
//
//                                 createQuery[functionDescriptor.idName] = args[0];
//
//                                 cacheModel.create(createQuery, (err) => {
//                                     if (err) {
//                                         winston.log('error', err);
//                                     }
//                                 });
//                             });
//                         } else {
//                             // If found, just return the cached result
//                             cb(undefined, result._result);
//                         }
//                     });
//                 } else {
//                     functionDescriptor.model['_' + functionDescriptor.funcName](...args);
//                 }
//             };
//
//             if (functionDescriptor.cache) {
//                 functionDescriptor.model[functionDescriptor.funcName].isCaching = true;
//
//                 functionDescriptor.model[functionDescriptor.funcName].invalidate = () => {
//                     cacheModel.remove({}, (err) => {
//                         if (err) {
//                             winston.log('error', err);
//                         }
//                     });
//                 }
//             }
//         });
//
//         return model;
//     };
// };