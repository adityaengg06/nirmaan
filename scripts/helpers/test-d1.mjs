// Test-only D1 facade backed by ephemeral SQLite; never opens a file or network.
import {DatabaseSync} from 'node:sqlite';
export function createTestD1(){
  const sqlite=new DatabaseSync(':memory:');
  function metadata(){const row=sqlite.prepare('SELECT changes() AS changes,last_insert_rowid() AS last_row_id').get();return {changes:Number(row.changes),last_row_id:Number(row.last_row_id),duration:0,rows_read:0,rows_written:0,size_after:0,changed_db:!!row.changes};}
  class Statement{
    constructor(sql,values=[]){this.sql=sql;this.values=values;}
    bind(...values){return new Statement(this.sql,values);}
    async run(){sqlite.prepare(this.sql).run(...this.values);return{success:true,results:[],meta:metadata()};}
    async all(){const rows=sqlite.prepare(this.sql).all(...this.values);return{success:true,results:rows.map(row=>({...row})),meta:metadata()};}
    async first(column){const row=sqlite.prepare(this.sql).get(...this.values);return row?(column===undefined?{...row}:row[column]??null):null;}
    async raw(options){const statement=sqlite.prepare(this.sql);statement.setReturnArrays(true);const rows=statement.all(...this.values);return options?.columnNames?[statement.columns().map(column=>column.name),...rows]:rows;}
  }
  const DB={
    prepare(sql){return new Statement(sql);},
    async batch(statements){
      sqlite.exec('BEGIN');
      try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    },
    async exec(sql){sqlite.exec(sql);return{count:0,duration:0};},
  };
  return {DB,sqlite,close(){sqlite.close()}};
}
