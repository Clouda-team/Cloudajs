/**
  * usage: fw.domdiff.convert(htmlfragment,target);
  */

(function(fw){
    
  fw.addSubPackage('domdiff');

      var util = {
        make : function(t,c) { 
          var d = document.createElement(t); 
          if(c){
            if(c.innerHTML){
              d.innerHTML = c.innerHTML;
            }else{
              d.innerHTML = c;
            }
          }; 
          return d; },
        arrayCopy : function(arr) {
          var narr = [], a, l=arr.length;
          for(a=0; a<l; a++) { narr[a] = arr[a]; }
          return narr;
        },
        mergeAttrs : function(e1,e2){
          var attrs = [],
            e1as = e1.attributes,
            e2as = e2.attributes,
            len;
          if(e1as && e2as) {
            var helper = document.createElement(e1.nodeName); 

            for(len = e1as.length-1;len>=0;len--){
              helper.setAttribute(e1as[len].nodeName,e1as[len].nodeValue);
            }
            for(len = e2as.length-1;len>=0;len--){
              helper.setAttribute(e2as[len].nodeName,e2as[len].nodeValue);
            }
            for(len = helper.attributes.length-1;len>=0;len--){
              attrs.push(helper.attributes[len].nodeName);
            }
          };
          return attrs;
        },

        snapshot : function(list) {
          var newlist = [], i=0, last=list.length;
          for(;i<last;i++) { newlist.push(list[i]); }
          return newlist;
        },

        hashCode : function(str,undef) {
          if(str===null || str===undef) return 0;

          var hash = 0, i, last = str.length;
          for (i = 0; i < last; ++i) {
            hash = (hash * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
          }
          return hash;
        },

        /*递归实现element的hash*/
        hashAll : function(element, undef) {
          var child,
              last = (element.childNodes === undef ? 0 : element.childNodes.length),
              hash = 0,
              hashString = element.nodeName;

          if(element.attributes) {
            var attr,
                a,
                attributes = element.attributes,
                len = attributes.length;
            for (a=0; a<len; a++) {
              attr = attributes[a];
              hashString += attr.nodeName+":"+attr.nodeValue;
            }
          }

          hash = util.hashCode( (hashString+element.textContent).replace(/\s+/g,''));
          
          for(child = last-1; child >=0; child--) {
            hash = (hash * 31 + util.hashAll(element.childNodes[child])) & 0xFFFFFFFF;
          }
          
          element["hashCode"] = hash;
          return hash;
        },

        find: function(e,treeRoute) {
          var route = util.snapshot(treeRoute),
              pos = route.splice(0,1)[0];
          while(pos!==-1) {
            e = e.childNodes[pos];
            pos = route.splice(0,1)[0];
          }
          return e;
        }
      }

      var getDiff = function(e1, e2) {
        var route = equal(e1,e2),
            routes = [route],
            newRoute;

        while(typeof route === "object") {
          newRoute = equal(e1,e2,util.arrayCopy(route));
          routes.push(newRoute);
          route = newRoute;
        }

        // 删除最后一项，因为最后一项代表的是wrap的attributes对比结果。不需要care wrap的对比结果
        if(routes.length>1) { routes.splice(routes.indexOf(0), 1); }
        return routes;
      };

      var equal = function(e1, e2, after) {
        var soffset = (after && after.length!==0 ? after.splice(0,1)[0] : 0);
        if(soffset === -1) {
          return 0;
        }

        if(e1.nodeType !== e2.nodeType) {
          return -1;
        }

        // shortcut handling for text?
        if(e1.nodeType===3 && e2.nodeType===3) {
          if(e1.textContent.trim() != e2.textContent.trim()) {
            return -1;
          }
          return 0;
        }

        // different element (2)?
        if(e1.nodeName !== e2.nodeName) {
          return -1;
        }

        // different content?
        if(e1.childNodes.length !== e2.childNodes.length) {
          return -1;
        }

        // Different child node list?
        // Find where the first difference is
        var i, last = e1.childNodes.length, eq, ret;
        for(i=soffset; i<last; i++) {
          // recurse to see if these children differ
          eq = equal(e1.childNodes[i], e2.childNodes[i], after);
          if(eq !== 0)
          {
            // (first) difference found. "eq" will indicate
            // which childNodes position the diff is found at.
            return [i].concat(eq);
          }
        }

        // different attributes?
        var attrs = util.mergeAttrs(e1,e2),
            a, last = attrs.length,
            attr, a1, a2;

        for(a=0; a<last; a++) {
          attr = attrs[a];
          a1 = e1.getAttribute(attr);
          a2 = e2.getAttribute(attr);
          if(a1==a2 || (!a1 && a2=="") || (!a2 && a1=="")) continue;
          return -1;
        }

        // nothing left to fail on - consider
        // these two elements equal.
        return 0;
      };

      /**
       * Do these elements agree on their HTML attributes?
       *
       * @return array of [differing attribute, value in e1, value in e2] triplets
       */
      function outerEquality(e1, e2) {
        var diff = [];
        
        // do the tags agree?
        if(e1.nodeType===1 && e2.nodeType===1) {
          if(e1.nodeName !== e2.nodeName) {
            diff.push(["nodeName",e1.nodeName,e2.nodeName]);
          }
        }

        // do the attributes agree?
        if(e1.attributes && e2.attributes) {
          var attributes = e1.attributes,
              len = attributes.length,
              a, a1, a2, attr;
          
          // attribute insertion/modification diff
          for (a=0; a<len; a++) {
            attr = attributes[a].nodeName;
            a1 = e1.getAttribute(attr);
            a2 = e2.getAttribute(attr);
            if(a1==a2) continue;
            diff.push([attr,a1,a2]);
          }
          
          // attribute removal diff
          attributes = e2.attributes;
          len = attributes.length;
          for (a=0; a<len; a++) {
            attr = attributes[a].nodeName;
            a1 = e1.getAttribute(attr);
            a2 = e2.getAttribute(attr);
            if(a1==a2) continue;
            diff.push([attr,a1,a2]);
          }
        }
        return diff;
      };


      /**
       * Do these elements agree on their content,
       * based on the .childNodes NodeSet?
       *
       * @return a diff tree between the two elements
       */
      var innerEquality = function(e1, e2) {
        util.hashAll(e1);
        util.hashAll(e2);
        c1 = util.snapshot(e1.childNodes);
        c2 = util.snapshot(e2.childNodes);
        var localdiff = childDiff(c1,c2);
        return (localdiff.insertions.length > 0 || localdiff.removals.length > 0 || localdiff.relocations.length > 0 ?  localdiff : false);
      };


      /**
       * Does a nodeset snapshot of an element's
       * .childNodes contain an element that has
       * <hash> as hashing number?
       *
       * @return -1 if not contained, or the
       *         position in the snapshot if
       *         it is contained.
       */
      function getPositions(list, reference) {
        var hash = reference.hashCode,
            c, last = list.length, child,
            result = [];
        for(c=0; c<last; c++) {
          child = list[c];
          if(child.hashCode === hash) {
            result.push(c);
          }
        }
        return result;
      }


      /**
       * Create a diff between .childNode
       * snapshots c1 and c2.
       *
       * @return a local content diff
       */
      function childDiff(c1, c2) {
        var relocations = [],
            insertions = [],
            removals = [];

        var c, last=c1.length, child, hash, positions, pos;
        for(c=0; c<last; c++) {
          child = c1[c];
          positions = getPositions(c2, child);

          if(positions.length===0) continue;

          if(positions.length>1) continue;

          pos = positions[0];
          if(c!==pos && getPositions(c1, child).length <= 1) {
            relocations.push(c2[pos]);
            child["marked"] = true;
            c2[pos]["marked"] = true;
          }

          else if(c===pos) {
            child["marked"] = true;
            c2[pos]["marked"] = true;
          }
        }

        last = c2.length;
        for(c=0; c<last; c++) {
          child = c2[c];
          if(!child["marked"]) {
            removals.push(child);
          }
        }
        
        last = c1.length;
        for(c=0; c<last; c++) {
          child = c1[c];
          if(!child["marked"]) {
            insertions.push(child);
          }
        }

        var localdiff = {
          c1: util.snapshot(c1),
          c2: util.snapshot(c2),
          relocations: relocations,
          insertions: insertions,
          removals: removals
        };
        return localdiff;
      }
      /**
       * newhtml : new dom
       * targetElement : 需要修改的dom
       */
      var convert = function(newhtml,targetElement) {

        var d1 = util.make(targetElement.nodeName,newhtml),d2 = targetElement;

        var routes = getDiff(d1,d2), route, iroute,
            d, lastRoute = routes.length, v;

        if(lastRoute===1 && routes[0]===0) { return false; }

        for(d = 0; d < lastRoute; d++)
        {
          if (routes[d] === 0) { continue; }

          // rewrite so we do can resolve the top-level diff
          if (routes[d] === -1) { routes[d] = [-1]; }

          // follow the route to the elements
          route = util.arrayCopy(routes[d]),
          iroute = util.arrayCopy(routes[d]);
          var e1 = d1, e2 = d2,
              e = route.splice(0,1)[0];
          while (e !== -1) {
            e1 = e1.childNodes[e];
            e2 = e2.childNodes[e];
            e = route.splice(0,1)[0]; 
          }

          if(e1.nodeType===3 && e2.nodeType===3) {
              var parent = e2.parentNode;
              parent.replaceChild(e1.cloneNode(),e2);
          }

          else {
            var complexDiff = innerEquality(e1,e2),
                pos, last, entry;

            //不对比最外层的attributes
            if(routes[d].length > 1){
              var outerDiff = outerEquality(e1,e2);
            }else{
              var outerDiff = [];
            }

            if(outerDiff.length>0) {
              last = outerDiff.length;
              for(pos=0; pos<last; pos++) {
                entry = outerDiff[pos];
                
                if(entry[0]==="nodeName") {
                  var element = util.find(d2,iroute),
                      newElement = document.createElement(entry[1]);

                  while(element.childNodes.length>0) {
                    newElement.appendChild(element.childNodes[0]);
                  }

                  for(var alen=element.attributes.length-1;alen>=0;alen--){
                    newElement.setAttribute(element.attributes[alen].nodeName,element.attributes[alen].nodeValue);
                  }

                  element.parentNode.replaceChild(newElement, element);
                }else {
                  var element = util.find(d2,iroute);
                  if(entry[1]==null) {
                    element.removeAttribute(entry[0]);
                  }else {
                    element.setAttribute(entry[0], entry[1]);
                  }
                }
              }
            }

            if(!complexDiff) {
              continue;
            }

            var parent = util.find(d2,iroute);
            var newParent = util.find(d1,iroute);

            //处理remove的节点
            last = complexDiff.removals.length;
            if(last>0) {
              for(pos=last-1; pos>=0; pos--) {
                entry = complexDiff.removals[pos];
                parent.removeChild(entry);
              }
            }

            //处理insert的节点，这时是无序插入的。
            last = complexDiff.insertions.length;
            if(last>0) {
              for(pos=0; pos<last; pos++) {
                entry = complexDiff.insertions[pos];
                var newEntry = entry.cloneNode(true);
                newEntry["hashCode"] = entry.hashCode;
                parent.appendChild(newEntry);//克隆的目的是为了包装参照树不被改变。
              }
            }

            /**
              var test = function(e,id){
              var last = e.length;
              var arr = [];
              for(var i=0;i<last;i++){
                arr.push(e[i][id]);
              }
            }*/
            //重新排序
            var newNodes = newParent.childNodes,
                nodes = parent.childNodes,
                oldPos,newPos;

            /**
              test(newNodes,'hashCode');
              test(nodes,'hashCode');
              */
            last = newNodes.length;
            for(newPos=0; newPos<last; newPos++) {
              oldPos = getPositions(nodes,newNodes[newPos]);
              if(oldPos.length<1){
                console.error('error: convert error');
                continue;
              }
              if(oldPos.length>1){
                if(oldPos[0]==newPos) continue;

                oldPos = oldPos[oldPos.length-1];
                entry = nodes[oldPos];
              }else{
                oldPos = oldPos[0];
                entry = nodes[oldPos];
              }
              if(oldPos===newPos) continue;

              parent.insertBefore(entry,nodes[newPos]);


            }

          }
        }

        return true;
      };

  fw.domdiff.__reg('convert', convert, 'private');
})(sumeru);