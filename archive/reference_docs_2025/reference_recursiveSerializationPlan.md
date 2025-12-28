# Full Recursive Serialization Implementation Plan

## 📋 **Incremental Plan: Full Recursive Serialization Implementation**

### **Phase 1: Create Serialization Infrastructure**
**Goal**: Build the recursive serialization/deserialization utilities without touching production code

**Step 1.1**: Create `scripts/utils/classSerializationUtils.js` with:
- `serializeWithTypes(obj)` function using recursive replacer
- `deserializeWithTypes(jsonString, classRegistry)` function using recursive reviver
- Comprehensive error handling and logging

**Step 1.2**: Create class registry mapping:
- Identify all classes used in entities: `Individual`, `Business`, `LegalConstruct`, `AggregateHousehold`, `AttributedTerm`, `ContactInfo`, `Address`, etc.
- Build registry object mapping class names to constructors

**Testing**: Console test with single entity - serialize → deserialize → verify all nested classes retain constructors

---

### **Phase 2: Isolated Testing**
**Goal**: Prove recursive serialization works end-to-end before touching production

**Step 2.1**: Create `scripts/testing/recursiveSerializationTest.js`
- Load one entity from current data
- Apply recursive serialization
- Verify ALL nested objects have proper constructor.name
- Test browser tool display functions with properly serialized entity

**Testing**: User console testing to confirm all class types preserved

---

### **Phase 3: Production Integration**
**Goal**: Update production processing to use recursive serialization

**Step 3.1**: Modify `processAllVisionAppraisalRecords.js`:
- Import serialization utils
- Replace `JSON.stringify(dataPackage, null, 2)` with `serializeWithTypes(dataPackage)`
- Keep existing `entityType` addition as fallback/validation

**Step 3.2**: Test with single entity processing
- Process one entity through updated pipeline
- Verify Google Drive save/load cycle preserves all class types

**Testing**: Single entity round-trip verification

---

### **Phase 4: Full Implementation**
**Goal**: Reprocess all entities with recursive serialization

**Step 4.1**: Full reprocessing run
- Execute complete entity processing with new serialization
- Monitor for any serialization failures
- Validate sample entities have proper nested class types

**Step 4.2**: Browser tool validation
- Refresh browser, load VisionAppraisal browser tool
- Verify entities show proper types (not "Unknown")
- Test address access and other nested object functionality

**Testing**: Full browser tool functionality verification

---

### **Phase 5: Cleanup and Documentation**
**Goal**: Clean up temporary code and document new serialization approach

**Step 5.1**: Remove temporary `entityType` property (now redundant)
**Step 5.2**: Update browser tool to use proper class constructors instead of fallback approaches
**Step 5.3**: Document new serialization architecture

---

### **🧪 Testing Protocol**
- **After each step**: Console testing by user
- **Failure handling**: Rollback to previous working state
- **Verification**: Always test both serialization AND deserialization
- **Browser validation**: Confirm browser tool works at each major milestone

**Ready to begin Phase 1: Creating the serialization infrastructure?**