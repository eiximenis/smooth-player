
// fields


mp4lib.fields.readBytes = function(buf, pos, nbBytes) {
    var value = 0;
    for (var i = 0; i < nbBytes; i++) {
        value = value << 8;
        value = value + buf[pos];
        pos++;
    }
    return value;
};

mp4lib.fields.writeBytes = function(buf, pos, nbBytes, value) {
    for (var i = 0; i < nbBytes; i++) {
        buf[pos + nbBytes - i - 1] = value & 0xFF;
        value = value >> 8;
    }
};


//------------------------------- NumberField -------------------------------

mp4lib.fields.NumberField = function(bits,signed) {
    this.bits = bits;
    this.signed = signed;
};

mp4lib.fields.NumberField.prototype.read = function(buf, pos) {
    return mp4lib.fields.readBytes(buf, pos, this.bits/8);
};

mp4lib.fields.NumberField.prototype.write = function(buf,pos,val) {
    mp4lib.fields.writeBytes(buf, pos, this.bits/8, val);
};

mp4lib.fields.NumberField.prototype.getLength = function(val) {
    return this.bits/8;
};

//------------------------------- 64BitsNumberField -------------------------------

mp4lib.fields.LongNumberField = function() {
}

mp4lib.fields.LongNumberField.prototype.read = function(buf, pos) {
    var high = mp4lib.fields.readBytes(buf, pos, 4);
    var low = mp4lib.fields.readBytes(buf, pos + 4, 4);
    return goog.math.Long.fromBits(low, high).toNumber();
};

mp4lib.fields.LongNumberField.prototype.write = function(buf, pos, val) {
    var longNumber = goog.math.Long.fromNumber(val);
    var low = longNumber.getLowBits();
    var high = longNumber.getHighBits();
    mp4lib.fields.writeBytes(buf, pos, 4, high);
    mp4lib.fields.writeBytes(buf, pos + 4, 4, low);
};

mp4lib.fields.LongNumberField.prototype.getLength = function(val) {
    return 8;
};

//------------------------------- FixedLenStringField -------------------------------

mp4lib.fields.FixedLenStringField = function(size) {
    this.size = size;
}

mp4lib.fields.FixedLenStringField.prototype.read = function(buf,pos){
    var res = "";
    for (var i=0;i<this.size;i++){
        res = res+String.fromCharCode(buf[pos+i]);
    }
    return res;
};

mp4lib.fields.FixedLenStringField.prototype.write = function(buf,pos,val){
    for (var i=0;i<this.size;i++){
        buf[pos+i] = val.charCodeAt(i);
    }
};

mp4lib.fields.FixedLenStringField.prototype.getLength = function(val){
    return this.size;
};


//------------------------------- StringField -------------------------------

mp4lib.fields.StringField = function() {
};

mp4lib.fields.StringField.prototype.read = function(buf,pos,end){
    var res = "";

    for (var i=pos;i<end;i++){
        res = res+String.fromCharCode(buf[i]);
        if (buf[i]==0){
            return res;
        }
    }
    throw 'expected null-terminated string, but end of field reached without termination, read so far:'+res;
//    return res;
};

mp4lib.fields.StringField.prototype.write = function(buf,pos,val){
    for (var i=0;i<val.length;i++)
    {
        buf[pos+i] = val.charCodeAt(i);
    }
    buf[pos+val.length] = 0;
};

mp4lib.fields.StringField.prototype.getLength = function(val){
    return val.length;
};

//------------------------------- BoxFillingDataField -------------------------------

mp4lib.fields.BoxFillingDataField= function() {
};

mp4lib.fields.BoxFillingDataField.prototype.read = function(buf,pos,end){
    var res = buf.subarray(pos,end);
    return res;
};

mp4lib.fields.BoxFillingDataField.prototype.write = function(buf,pos,val){
    buf.set(val,pos);
};

mp4lib.fields.BoxFillingDataField.prototype.getLength = function(val){
    return val.length;
};


//------------------------------- DataField -------------------------------

mp4lib.fields.DataField = function(len) {
    this.len = len;
};

mp4lib.fields.DataField.prototype.read = function(buf,pos,end){
    var res = buf.subarray(pos,pos+this.len);
    return res;
};

mp4lib.fields.DataField.prototype.write = function(buf,pos,val){
    buf.set(val,pos);
};

mp4lib.fields.DataField.prototype.getLength = function(val){
    return this.len;
};


//------------------------------- ArrayField -------------------------------

mp4lib.fields.ArrayField = function(innerField,size) {
    this.innerField = innerField;
    this.size = size;
};

mp4lib.fields.ArrayField.prototype.read = function(buf,pos,end){
    var innerFieldLength=-1;
    var res = [];
    for (var i=0;i<this.size;i++){
        
        res.push(this.innerField.read(buf,pos));

        if (innerFieldLength==-1)
            innerFieldLength = this.innerField.getLength(res[i]);
            // it may happen that the size of field depends on the box flags, we need to count is having box and first structure constructed

        pos+=innerFieldLength;
    }
    return res;
};

mp4lib.fields.ArrayField.prototype.write = function(buf,pos,val){
    var innerFieldLength=0;
    if (this.size>0){
        innerFieldLength=this.innerField.getLength(val[0]);
    }

    for (var i=0;i<this.size;i++){
        //console.log('ZAPISUJE POLE TABLICY NA POZYCJI'+pos);
        this.innerField.write(buf,pos,val[i]);
        pos+=innerFieldLength;
    }
};

mp4lib.fields.ArrayField.prototype.getLength = function(val) {
    var innerFieldLength=0;
    if (this.size>0){
        innerFieldLength=this.innerField.getLength(val[0]);
    }
    return this.size*innerFieldLength;
};

//------------------------------- VariableElementSizeArrayField -------------------------------

mp4lib.fields.VariableElementSizeArrayField = function(innerField,size) {
    this.innerField = innerField;
    this.size = size;
};

mp4lib.fields.VariableElementSizeArrayField.prototype.read = function(buf,pos,end){
    var res = [];
    for(var i=0;i<this.size;i++){
        res.push(this.innerField.read(buf,pos));
        pos+=this.innerField.getLength(res[i]);
    }
    return res;
};

mp4lib.fields.VariableElementSizeArrayField.prototype.write = function(buf,pos,val){
    for(var i=0;i<this.size;i++){
        this.innerField.write(buf,pos,val[i]);
        pos+=this.innerField.getLength(val[i]);
    }
};

mp4lib.fields.VariableElementSizeArrayField.prototype.getLength = function(val) {
    var res = 0;
    for(var i=0;i<this.size;i++){
        res+=this.innerField.getLength(val[i]);
    }
    return res;
};


//------------------------------- BoxFillingArrayField -------------------------------

mp4lib.fields.BoxFillingArrayField = function(innerField) {
    this.innerField = innerField;
    this.innerFieldLength=innerField.getLength();
};

mp4lib.fields.BoxFillingArrayField.prototype.read = function(buf,pos,end){
    var res = [];
    var size = (end-pos)/this.innerFieldLength;

    for(var i=0;i<size;i++){
        res.push(this.innerField.read(buf,pos));
        pos+=this.innerFieldLength;
    }
    return res;
};

mp4lib.fields.BoxFillingArrayField.prototype.write = function(buf,pos,val){
    for(var i=0;i<val.length;i++){
        this.innerField.write(buf,pos,val[i]);
        pos+=this.innerFieldLength;
    }
};

mp4lib.fields.BoxFillingArrayField.prototype.getLength = function(val) {
    return val.length*this.innerFieldLength;
};


//------------------------------- StructureField -------------------------------

mp4lib.fields.StructureField = function( box, _processStructureFields ) {
    this.box = box;
    this._processStructureFields = _processStructureFields;
};

mp4lib.fields.StructureField.prototype.read = function(buf,pos,end){
    var struct = {};
    var p = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(struct,buf,pos,end);
    this._processStructureFields.call(struct,this.box,p);
    return struct;
};


mp4lib.fields.StructureField.prototype.write = function(buf,pos,val){
    var p = new  mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(val,buf,pos);
    this._processStructureFields.call(val,this.box,p);
};

mp4lib.fields.StructureField.prototype.getLength = function(val) {
    var p = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(val);
    this._processStructureFields.call(val,this.box,p);
    if (isNaN(p.res) && (val===undefined)){
        console.log('ERROR: The structure contained in '+this.box.boxtype+' box has undefined size. Possible cause: you have put a variable sized structure into ArrayField (but ArrayField assumes all elements have the same size). If this is the cause, use VariableElementsSizeArrayField instead.');
    }
    return p.res;
};

//------------------------------- BoxesListField -------------------------------

mp4lib.fields.BoxesListField = function() {
};

mp4lib.fields.readString = function( buf, pos, count ){
    var res = "";
    for (var i=pos;i<pos+count;i++){
        res = res+String.fromCharCode(buf[i]);
    }
    return res;
};

mp4lib.fields.BoxesListField.prototype.read = function(buf,pos,end){
    // czytamy z bufora dzieci i dodajemy je do rodzica
    var res = [];
    while (pos<end){
        // Read box size
        // TOOD : replace by Constent ??
        var size = new mp4lib.fields.NumberField(32, false).read(buf, pos);

        // Read boxtype
        var boxtype = mp4lib.fields.readString(buf, pos+4, 4);

        // Extented type?
        if (boxtype == "uuid"){
            var uuidFieldPos = (size == 1)?16:8;
            // TODO : replace by constant ?
            var uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(buf, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            // TODO : why prototype is used here ??
            boxtype = mp4lib.boxes.Box.prototype.uuidToBoxTypes[JSON.stringify(uuid)];
            if (boxtype === undefined) {
                boxtype = "uuid";
            }
        }

        var box;
        if (boxtype in mp4lib.boxes.Box.prototype.boxPrototypes)
        // TODO : why protoype is used here ?
            box = new mp4lib.boxes.Box.prototype.boxPrototypes[boxtype]();
        else  {
            console.log('WARNING: Unknown boxtype:'+boxtype+', parsing as UnknownBox');
            box = new mp4lib.boxes.UnknownBox();
        }

        // process to read size
        var p = new mp4lib.fieldProcessors.DeserializationBoxFieldsProcessor(box,buf,pos,end);
        box._processFields(p);
        // TODO : remove bufferSource reference... it increase memory for nothing
        box.__sourceBuffer = buf.subarray(pos,pos+box.size);
        // the sourcebuffer is kept for debug purposes only, it is not used for any data processing        

        // (Re)set box type in case of extended type
        box.boxtype = boxtype;

        res.push(box);
        pos+=box.size;
        if (box.size==0){
            console.log('Invalid size (0) of a box with boxtype '+box.boxtype+', deserialization of children stopped');
            return;
        }
    }
    return res;
};

mp4lib.fields.BoxesListField.prototype.write = function(buf,pos,val){
   // zrzucamy wszystkie dzieci do bufora
   for (var i=0;i<val.length;i++){
       var box = val[i];
       //console.log('ZRZUCAM DZIECKO NR '+i+' ('+box.boxtype+') NA POZYCJI '+pos);
       var sp = new mp4lib.fieldProcessors.SerializationBoxFieldsProcessor(box, buf, pos);
       box._processFields(sp);
       pos = pos+box.size;
   }
};

mp4lib.fields.BoxesListField.prototype.getLength = function(val) {
    var i;
    var res = 0;
    for (i=0;i<val.length;i++)
    {
        var box = val[i];
        var p = new mp4lib.fieldProcessors.LengthCounterBoxFieldsProcessor(box);
        box._processFields(p);
        box.size = p.res;
        res = res+p.res;
    }
    return res;
};



// pre-defined shortcuts for common fields 
// ( it is recommended to use these shortcuts to avoid constructors being called for every field processing action)
mp4lib.fields.FIELD_INT8   = new mp4lib.fields.NumberField(8,true);
mp4lib.fields.FIELD_INT16  = new mp4lib.fields.NumberField(16,true);
mp4lib.fields.FIELD_INT32  = new mp4lib.fields.NumberField(32,true);
mp4lib.fields.FIELD_INT64 = new mp4lib.fields.LongNumberField();
mp4lib.fields.FIELD_UINT8  = new mp4lib.fields.NumberField(8,false);
mp4lib.fields.FIELD_UINT16 = new mp4lib.fields.NumberField(16,false);
mp4lib.fields.FIELD_UINT32 = new mp4lib.fields.NumberField(32,false);
mp4lib.fields.FIELD_UINT64 = new mp4lib.fields.LongNumberField();
mp4lib.fields.FIELD_BIT8   = new mp4lib.fields.NumberField(8,false);
mp4lib.fields.FIELD_BIT16  = new mp4lib.fields.NumberField(16,false);
mp4lib.fields.FIELD_BIT24  = new mp4lib.fields.NumberField(24,false);
mp4lib.fields.FIELD_BIT32  = new mp4lib.fields.NumberField(32,false);
mp4lib.fields.FIELD_ID = new mp4lib.fields.FixedLenStringField(4);
mp4lib.fields.FIELD_CONTAINER_CHILDREN = new mp4lib.fields.BoxesListField();
mp4lib.fields.FIELD_STRING = new mp4lib.fields.StringField();
mp4lib.fields.FIELD_BOX_FILLING_DATA = new mp4lib.fields.BoxFillingDataField();
